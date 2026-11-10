import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { sendErrorPostReceive } from './GenericFunctions';

export const imageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Generate Image',
				value: 'create',
				action: 'Generate an image',
				description:
					'Create one or more new pictures from a text description (returned as a file or a URL)',
				routing: {
					request: {
						method: 'POST',
						url: '/images/generations',
					},
					output: {
						postReceive: [
							sendErrorPostReceive,
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
			},
			{
				name: 'Analyze Images',
				value: 'analyze',
				action: 'Analyze images with text',
				description:
					'Send a text (e.g. an email body) and one or more images in a single request, and get a written answer (description, summary, data extraction…)',
				routing: {
					request: {
						method: 'POST',
						url: '/chat/completions',
					},
					send: { preSend: [buildAnalyzeBody] },
					output: { postReceive: [sendErrorPostReceive, simplifyAnalyzeOutput] },
				},
			},
		],
		default: 'create',
	},
];

const createOperations: INodeProperties[] = [
	{
		displayName: 'Image Description',
		name: 'prompt',
		type: 'string',
		placeholder: 'e.g. A cute cat eating a dinosaur',
		description:
			'Describe the picture you want: subject, style, colors, framing. The maximum length is 1000 characters.',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'prompt',
			},
		},
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		default: '',
		description: 'The model to use for image generation',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
				'@version': [1],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'Model',
		name: 'imageModel',
		type: 'options',
		required: true,
		default: '',
		description: 'The model to use for image generation',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
			hide: {
				'@version': [1],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'Return Image As',
		name: 'responseFormat',
		type: 'options',
		default: 'binaryData',
		description:
			'File: ready to attach to an email or upload. URL: a temporary link to the image.',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'File',
				value: 'binaryData',
			},
			{
				name: 'Image URL',
				value: 'imageUrl',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'response_format',
				value: '={{ $value === "imageUrl" ? "url" : "b64_json" }}',
			},
			output: {
				postReceive: [
					async function (items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
						if (this.getNode().parameters.responseFormat === 'imageUrl') {
							return items;
						}

						const result: INodeExecutionData[] = [];
						for (let i = 0; i < items.length; i++) {
							result.push({
								json: {},
								binary: {
									data: await this.helpers.prepareBinaryData(
										Buffer.from(items[i].json.b64_json as string, 'base64'),
										'data',
									),
								},
							} as INodeExecutionData);
						}

						return result;
					},
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Number of Images',
				name: 'n',
				default: 1,
				description: 'Number of images to generate',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				routing: {
					send: {
						type: 'body',
						property: 'n',
					},
				},
			},
			{
				displayName: 'Quality',
				name: 'quality',
				type: 'options',
				options: [
					{
						name: 'HD',
						value: 'hd',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
				],
				displayOptions: {
					show: {
						'/model': ['dall-e-3'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'quality',
					},
				},
				default: 'standard',
			},
			{
				displayName: 'Resolution',
				name: 'size',
				type: 'options',
				options: [
					{
						name: '256x256',
						value: '256x256',
					},
					{
						name: '512x512',
						value: '512x512',
					},
					{
						name: '1024x1024',
						value: '1024x1024',
					},
				],
				displayOptions: {
					show: {
						'/model': ['dall-e-2'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'size',
					},
				},
				default: '1024x1024',
			},
			{
				displayName: 'Resolution',
				name: 'size',
				type: 'options',
				options: [
					{
						name: '1024x1024',
						value: '1024x1024',
					},
					{
						name: '1792x1024',
						value: '1792x1024',
					},
					{
						name: '1024x1792',
						value: '1024x1792',
					},
				],
				displayOptions: {
					show: {
						'/model': ['dall-e-3'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'size',
					},
				},
				default: '1024x1024',
			},
			{
				displayName: 'Style',
				name: 'style',
				type: 'options',
				options: [
					{
						name: 'Natural',
						value: 'natural',
					},
					{
						name: 'Vivid',
						value: 'vivid',
					},
				],
				displayOptions: {
					show: {
						'/model': ['dall-e-3'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'style',
					},
				},
				default: 'vivid',
			},
		],
	},
];

async function buildAnalyzeBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const inputType = this.getNodeParameter('inputType') as 'url' | 'binary' | 'allBinary' | 'none';
	const options = this.getNodeParameter('analyzeOptions', {}) as {
		detail?: string;
		maxTokens?: number;
		systemMessage?: string;
	};

	let urls: string[] = [];
	if (inputType === 'allBinary') {
		for (const [name, binary] of Object.entries(this.getInputData().binary ?? {})) {
			// Email attachments may include PDFs, etc. — only images are sent to the vision model.
			if (!binary.mimeType?.startsWith('image/')) continue;
			const buffer = await this.helpers.getBinaryDataBuffer(name);
			urls.push(`data:${binary.mimeType};base64,${buffer.toString('base64')}`);
		}
	} else if (inputType === 'binary') {
		const names = (this.getNodeParameter('binaryPropertyName') as string)
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean);
		for (const name of names) {
			const { mimeType } = this.helpers.assertBinaryData(name);
			const buffer = await this.helpers.getBinaryDataBuffer(name);
			urls.push(`data:${mimeType};base64,${buffer.toString('base64')}`);
		}
	} else if (inputType === 'url') {
		urls = (this.getNodeParameter('imageUrls') as string)
			.split(',')
			.map((url) => url.trim())
			.filter(Boolean);
	}

	const text = this.getNodeParameter('text') as string;
	if (urls.length === 0 && !text.trim()) {
		throw new NodeOperationError(this.getNode(), 'Provide a text input or at least one image');
	}

	requestOptions.body = {
		model: this.getNodeParameter('analyzeModel') as string,
		messages: [
			...(options.systemMessage ? [{ role: 'system', content: options.systemMessage }] : []),
			{
				role: 'user',
				content: [
					...(text.trim() ? [{ type: 'text', text }] : []),
					...urls.map((url) => ({
						type: 'image_url',
						image_url: { url, detail: options.detail ?? 'auto' },
					})),
				],
			},
		],
		...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
	};
	return requestOptions;
}

async function simplifyAnalyzeOutput(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	if (this.getNodeParameter('simplifyOutput', true) === false) {
		return items;
	}
	return items.map((item) => {
		const choices = (item.json.choices ?? []) as Array<{ message?: { content?: string } }>;
		return { json: { content: choices[0]?.message?.content ?? '' } };
	});
}

const show = { resource: ['image'], operation: ['analyze'] };

const analyzeOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'analyzeModel',
		type: 'options',
		required: true,
		default: '',
		description: 'A model that can read images (vision model), e.g. GPT-4o, Claude or Gemini',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/models',
					},
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'data' } },
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
								},
							},
							{ type: 'sort', properties: { key: 'name' } },
						],
					},
				},
			},
		},
		displayOptions: { show },
	},
	{
		displayName: 'Instruction / Text',
		name: 'text',
		type: 'string',
		placeholder: 'e.g. Summarize this email and its attachments: {{ $json.text }}',
		description:
			'What you want the model to do with the images, plus any text to include (e.g. an email body)',
		default: "What's in this image?",
		typeOptions: { rows: 4 },
		displayOptions: { show },
	},
	{
		displayName: 'Images to Send',
		name: 'inputType',
		type: 'options',
		default: 'url',
		description: 'Where the images come from',
		options: [
			{
				name: 'All Images From Previous Node',
				value: 'allBinary',
				description:
					'Every image file of the incoming item, e.g. all email attachments (PDFs and other files are ignored)',
			},
			{
				name: 'Specific Files',
				value: 'binary',
				description: 'Only the files whose field names you list',
			},
			{
				name: 'Image URLs',
				value: 'url',
				description: 'Public links to images',
			},
			{
				name: 'No Image (Text Only)',
				value: 'none',
				description: 'Send only the text',
			},
		],
		displayOptions: { show },
	},
	{
		displayName: 'Image URL(s)',
		name: 'imageUrls',
		type: 'string',
		placeholder: 'e.g. https://example.com/image.jpeg, https://example.com/photo.png',
		description: 'Public link(s) to the image(s), separate multiple URLs with commas',
		default: '',
		displayOptions: { show: { ...show, inputType: ['url'] } },
	},
	{
		displayName: 'File Field Name(s)',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. attachment_0, attachment_1',
		hint: 'Shown in the "Binary" tab of the previous node output',
		description: 'Name of the binary field(s) which contain the image(s), separate multiple field names with commas',
		displayOptions: { show: { ...show, inputType: ['binary'] } },
	},
	{
		displayName: 'Return Only the Answer',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		description:
			'Whether to return only the answer (in a "content" field) instead of the full API response',
		displayOptions: { show },
	},
	{
		displayName: 'Options',
		name: 'analyzeOptions',
		placeholder: 'Add option',
		type: 'collection',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Image Detail Level',
				name: 'detail',
				type: 'options',
				default: 'auto',
				description: 'How closely the model looks at the images. Higher detail costs more tokens.',
				options: [
					{ name: 'Auto', value: 'auto', description: 'Let the model decide' },
					{
						name: 'Low (Cheaper)',
						value: 'low',
						description: 'Good for general content; recommended with many images',
					},
					{
						name: 'High (Precise)',
						value: 'high',
						description: 'Needed to read small text, tables or invoices',
					},
				],
			},
			{
				displayName: 'Maximum Answer Length (Tokens)',
				name: 'maxTokens',
				type: 'number',
				default: 300,
				description:
					'Maximum length of the answer, in tokens (1 token ≈ 4 characters). Increase it for long summaries.',
				typeOptions: { minValue: 1 },
			},
			{
				displayName: 'Model Instructions (System Message)',
				name: 'systemMessage',
				type: 'string',
				default: '',
				description: 'General behavior for the model: role, tone, language, output format',
				placeholder: 'e.g. You are a support assistant. Answer in French.',
				typeOptions: { rows: 3 },
			},
		],
	},
];

export const imageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                image:create                                */
	/* -------------------------------------------------------------------------- */
	...createOperations,

	/* -------------------------------------------------------------------------- */
	/*                                image:analyze                               */
	/* -------------------------------------------------------------------------- */
	...analyzeOperations,
];
