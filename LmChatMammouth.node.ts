import { ChatOpenAI, type ChatOpenAIFields } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

type ModelOptions = {
	frequencyPenalty?: number;
	maxTokens?: number;
	maxRetries?: number;
	presencePenalty?: number;
	responseFormat?: 'text' | 'json_object';
	temperature?: number;
	timeout?: number;
	topP?: number;
};

export class LmChatMammouth implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mammouth Chat Model',
		name: 'lmChatMammouth',
		icon: { light: 'file:icons/mammouth.svg', dark: 'file:icons/mammouth.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Chat model from the Mammouth API, for use with AI Agents and Chains',
		defaults: {
			name: 'Mammouth Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'mammouthApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.url.trim().replace(/[/]+$/, "") }}',
		},
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description: 'The model available on your Mammouth API which will generate the completion',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						type: 'number',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: -1,
						description: 'The maximum number of tokens to generate. -1 lets the API decide.',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						type: 'number',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						type: 'number',
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						default: 'text',
						type: 'options',
						options: [
							{ name: 'Text', value: 'text' },
							{
								name: 'JSON',
								value: 'json_object',
								description: 'The prompt must contain the word "json"',
							},
						],
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						description: 'Maximum request time in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						type: 'number',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials<{ url: string }>('mammouthApi');
				const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'mammouthApi', {
					method: 'GET',
					url: `${credentials.url.trim().replace(/[/]+$/, '')}/models`,
					json: true,
				})) as { data?: Array<{ id: string }> } | Array<{ id: string }>;
				const models = Array.isArray(response) ? response : (response.data ?? []);
				return models
					.map(({ id }) => ({ name: id, value: id }))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials<{ url: string; apiKey: string }>('mammouthApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const { responseFormat, maxRetries, maxTokens, ...options } = this.getNodeParameter(
			'options',
			itemIndex,
			{},
		) as ModelOptions;

		const fields: ChatOpenAIFields = {
			apiKey: credentials.apiKey,
			model,
			...options,
			maxTokens: maxTokens === -1 ? undefined : maxTokens,
			maxRetries: maxRetries ?? 2,
			configuration: {
				baseURL: credentials.url.trim().replace(/[/]+$/, ''),
			},
			modelKwargs: responseFormat ? { response_format: { type: responseFormat } } : undefined,
		};

		return { response: new ChatOpenAI(fields) };
	}
}
