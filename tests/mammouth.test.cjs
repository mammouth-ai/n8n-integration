const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { resolve, basename } = require('node:path');
const { test } = require('node:test');
const { Expression, NodeApiError } = require('n8n-workflow');
const manifest = require('../package.json');
const { MammouthAi } = require('../dist/MammouthAi.node.js');
const { MammouthApi } = require('../dist/MammouthApi.credentials.js');
const { sendErrorPostReceive } = require('../dist/GenericFunctions.js');

const root = resolve(__dirname, '..');
const node = new MammouthAi().description;
const credential = new MammouthApi();
// n8n strips the parameter's leading '=' before passing it to this evaluator.
const evaluate = (expression, data) => Expression.resolveWithoutWorkflow(expression.slice(1), data);

test('n8n entry points export classes matching their filenames', () => {
	for (const entry of [...manifest.n8n.nodes, ...manifest.n8n.credentials]) {
		const file = resolve(root, entry);
		const className = basename(entry).split('.')[0];
		assert.equal(typeof require(file)[className], 'function');
		assert.ok(new (require(file)[className])());
	}
	assert.notEqual(node.hidden, true);
	assert.equal(node.credentials[0].name, credential.name);
	assert.equal(node.properties.find((property) => property.name === 'resource').default, 'chat');
});

test('metadata and themed icons are included for nodes and credentials', () => {
	const codex = JSON.parse(readFileSync(resolve(root, 'dist/MammouthAi.node.json'), 'utf8'));
	assert.equal(codex.node, `${manifest.name}.${node.name}`);
	assert.deepEqual(credential.icon, node.icon);
	for (const theme of ['light', 'dark']) {
		const icon = node.icon[theme];
		// n8n's icon route requires a directory between the package and filename.
		assert.match(icon, /^file:icons\/[^/]+\.svg$/);
		const relativePath = icon.replace('file:', '');
		assert.ok(existsSync(resolve(root, 'dist', relativePath)));
		assert.equal(
			readFileSync(resolve(root, 'dist', relativePath), 'utf8'),
			readFileSync(resolve(root, basename(relativePath)), 'utf8'),
		);
	}
});

test('base URL preserves the API prefix and removes trailing slashes', () => {
	for (const [url, expected] of [
		['https://api.example.com/v1', 'https://api.example.com/v1'],
		[' https://api.example.com/proxy/v1/// ', 'https://api.example.com/proxy/v1'],
		['https://api.example.com/', 'https://api.example.com'],
		['', ''],
	]) {
		for (const expression of [node.requestDefaults.baseURL, credential.test.request.baseURL]) {
			assert.equal(evaluate(expression, { $credentials: { url } }), expected);
		}
	}
	assert.equal(credential.properties.find((property) => property.name === 'url').required, true);
});

test('credentials send a Bearer token and protect the API key input', () => {
	assert.equal(evaluate(credential.authenticate.properties.headers.Authorization, {
		$credentials: { apiKey: 'test-secret' },
	}), 'Bearer test-secret');
	assert.equal(credential.properties.find((property) => property.name === 'apiKey').typeOptions.password, true);
});

test('all model selectors allow non-OpenAI model identifiers', () => {
	const models = node.properties.filter((property) => ['model', 'chatModel', 'imageModel'].includes(property.name));
	assert.equal(models.length, 7);
	for (const model of models) {
		assert.equal(model.default, '');
		assert.equal(model.required, true);
		if (model.type === 'string') continue;
		const routing = model.typeOptions.loadOptions.routing;
		assert.equal(routing.request.url, '/models');
		assert.ok(!routing.output.postReceive.some((step) => step.type === 'filter'));
		const mapping = routing.output.postReceive.find((step) => step.type === 'setKeyValue');
		assert.equal(evaluate(mapping.properties.value, { $responseItem: { id: 'mammouth-chat' } }), 'mammouth-chat');
	}
});

test('HTTP error hook rejects 4xx/5xx and preserves successful output', async () => {
	const context = { getNode: () => ({ name: 'Mammouth', type: 'mammouth', typeVersion: 1.1, parameters: {} }) };
	const items = [{ json: { ok: true } }];
	assert.equal(await sendErrorPostReceive.call(context, items, { statusCode: 200 }), items);
	for (const statusCode of [400, 401, 429, 500, 503]) {
		await assert.rejects(sendErrorPostReceive.call(context, items, {
			statusCode, body: { error: { message: 'Test error' } }, headers: {},
		}), NodeApiError);
	}
});

test('configured model and chat requests work against a local compatible API', async (t) => {
	const received = [];
	const server = createServer(async (request, response) => {
		let body = '';
		for await (const chunk of request) body += chunk;
		received.push({ url: request.url, method: request.method, authorization: request.headers.authorization, body });
		response.setHeader('Content-Type', 'application/json');
		response.end(JSON.stringify(request.method === 'GET'
			? { data: [{ id: 'mammouth-chat' }] }
			: { choices: [{ message: { role: 'assistant', content: 'Bonjour' } }] }));
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	t.after(() => new Promise((resolveClose) => server.close(resolveClose)));
	const data = { $credentials: { url: `http://127.0.0.1:${server.address().port}/proxy/v1/`, apiKey: 'local-test' } };
	const baseURL = evaluate(node.requestDefaults.baseURL, data);
	const headers = { Authorization: evaluate(credential.authenticate.properties.headers.Authorization, data), 'Content-Type': 'application/json' };
	const models = await fetch(baseURL + credential.test.request.url, { headers });
	assert.deepEqual(await models.json(), { data: [{ id: 'mammouth-chat' }] });
	const operation = node.properties.find((property) => property.name === 'operation' && property.displayOptions.show.resource.includes('chat')).options[0];
	const prompt = node.properties.find((property) => property.name === 'prompt' && property.type === 'fixedCollection');
	const messages = [{ role: 'user', content: 'Bonjour' }];
	const response = await fetch(baseURL + operation.routing.request.url, {
		method: operation.routing.request.method,
		headers,
		body: JSON.stringify({ model: 'mammouth-chat', messages: evaluate(prompt.routing.send.value, { $value: { messages } }) }),
	});
	assert.equal((await response.json()).choices[0].message.content, 'Bonjour');
	assert.deepEqual(received.map(({ url, method, authorization }) => ({ url, method, authorization })), [
		{ url: '/proxy/v1/models', method: 'GET', authorization: 'Bearer local-test' },
		{ url: '/proxy/v1/chat/completions', method: 'POST', authorization: 'Bearer local-test' },
	]);
	assert.deepEqual(JSON.parse(received[1].body), { model: 'mammouth-chat', messages });
});