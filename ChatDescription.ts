import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { sendErrorPostReceive } from './GenericFunctions';

export const chatOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Send Message',
				value: 'complete',
				action: 'Send a message to a model',
				description:
					'Send one or more messages to an AI model and get its reply. Use this to generate any kind of text.',
				routing: {
					request: {
						method: 'POST',
						url: '/chat/completions',
					},
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
		],
		default: 'complete',
	},
];

const completeOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description:
			'The model available on your Mammouth API which will generate the completion',
		displayOptions: {
			show: {
				operation: ['complete'],
				resource: ['chat'],
				'@version': [1],
			},
		},
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
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		required: true,
		default: '',
	},
	{
		displayName: 'Model',
		name: 'chatModel',
		type: 'options',
		description:
			'The model available on your Mammouth API which will generate the completion',
		displayOptions: {
			show: {
				operation: ['complete'],
				resource: ['chat'],
			},
			hide: {
				'@version': [1],
			},
		},
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
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		required: true,
		default: '',
	},
	{
		displayName: 'Messages',
		name: 'prompt',
		type: 'fixedCollection',
		description:
			'The conversation sent to the model, in order. Usually: one "Instructions" message (optional) then one "User" message with your request.',
		hint: 'Example: Instructions = "You are a support agent, answer in French" / User = "Reply to this email: {{ $json.text }}"',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['complete'],
			},
		},
		placeholder: 'Add Message',
		default: {},
		options: [
			{
				displayName: 'Message',
				name: 'messages',
				values: [
					{
						displayName: 'From',
						name: 'role',
						type: 'options',
						options: [
							{
								name: 'AI (Assistant)',
								value: 'assistant',
								description: 'A previous reply from the model',
							},
							{
								name: 'Instructions (System)',
								value: 'system',
								description: 'Tells the model how to behave (tone, language, role…)',
							},
							{
								name: 'User',
								value: 'user',
								description: 'A message or question from the user',
							},
						],
						default: 'user',
					},
					{
						displayName: 'Text',
						name: 'content',
						placeholder: 'e.g. Write a polite reply to this email: {{ $json.text }}',
						description: 'Content of the message. You can use expressions to insert data from previous nodes.',
						type: 'string',
						default: '',
						typeOptions: { rows: 2 },
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'messages',
				value: '={{ $value.messages }}',
			},
		},
	},
];

const sharedOperations: INodeProperties[] = [
	{
		displayName: 'Return Only the Reply',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['complete'],
				resource: ['chat'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{$value}}',
						properties: {
							value: '={{ { "data": $response.body.choices } }}',
						},
					},
					{
						type: 'rootProperty',
						enabled: '={{$value}}',
						properties: {
							property: 'data',
						},
					},
					async function (items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
						if (this.getNode().parameters.simplifyOutput === false) {
							return items;
						}
						return items.map((item) => {
							return {
								json: {
									...item.json,
									message: item.json.message,
								},
							};
						});
					},
				],
			},
		},
		description: 'Whether to return only the model reply instead of the full API response',
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
				operation: ['complete'],
				resource: ['chat'],
			},
		},
		options: [
			{
				displayName: 'Include Prompt in Output',
				name: 'echo',
				type: 'boolean',
				description: 'Whether to repeat the prompt before the generated text',
				default: false,
				displayOptions: {
					show: {
						'/operation': ['complete'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'echo',
					},
				},
			},
			{
				displayName: 'Avoid Repetition (Frequency Penalty)',
				name: 'frequency_penalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					'From -2 to 2. Higher values make the model less likely to repeat the same words and sentences.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'frequency_penalty',
					},
				},
			},
			{
				displayName: 'Maximum Response Length (Tokens)',
				name: 'maxTokens',
				default: 16,
				description:
					'Maximum length of the reply, in tokens (1 token ≈ 4 characters). Too low a value cuts the reply short.',
				type: 'number',
				displayOptions: {
					show: {
						'/operation': ['complete'],
					},
				},
				typeOptions: {
					maxValue: 32768,
				},
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens',
					},
				},
			},
			{
				displayName: 'Number of Replies',
				name: 'n',
				default: 1,
				description:
					'How many alternative replies to generate. Each reply consumes tokens, so higher values cost more.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'n',
					},
				},
			},
			{
				displayName: 'Encourage New Topics (Presence Penalty)',
				name: 'presence_penalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					'From -2 to 2. Higher values push the model to talk about new subjects instead of staying on the same ones.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'presence_penalty',
					},
				},
			},
			{
				displayName: 'Creativity (Temperature)',
				name: 'temperature',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'From 0 to 1. Low values give focused, predictable answers; high values give more varied, creative answers.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'temperature',
					},
				},
			},
			{
				displayName: 'Word Choice Diversity (Top P)',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'From 0 to 1. Lower values restrict the model to its most likely words. Change this or Creativity, not both.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'top_p',
					},
				},
			},
		],
	},
];

export const chatFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                               chat:complete                        */
	/* -------------------------------------------------------------------------- */
	...completeOperations,

	/* -------------------------------------------------------------------------- */
	/*                                chat:ALL                                    */
	/* -------------------------------------------------------------------------- */
	...sharedOperations,
];
