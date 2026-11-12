import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { sendErrorPostReceive } from './GenericFunctions';

export const textOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['text'],
			},
		},
		options: [
			{
				name: 'Continue',
				value: 'complete',
				action: 'Continue a text',
				description:
					'The model writes what comes next after your text (autocomplete), without following instructions. To ask for a text, use Chat → Send Message instead.',
				routing: {
					request: {
						method: 'POST',
						url: '/completions',
					},
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
			{
				name: 'Edit',
				value: 'edit',
				action: 'Edit a text',
				description:
					'Rewrite a text following an instruction (e.g. fix spelling). Requires a model supporting the /edits endpoint; Chat works for this too.',
				routing: {
					request: {
						method: 'POST',
						url: '/edits',
					},
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
			{
				name: 'Check Content Safety',
				value: 'moderate',
				action: 'Check a text for unsafe content',
				description:
					'Does not generate text. Tells you whether a text contains hate, harassment, violence, sexual or self-harm content (e.g. to filter user messages before replying).',
				routing: {
					request: {
						method: 'POST',
						url: '/moderations',
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
				resource: ['text'],
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
		displayName: 'Beginning of the Text',
		name: 'prompt',
		type: 'string',
		description:
			'The model continues writing from this text. It is not an instruction: "Once upon a time" works, "Write a story" may not.',
		placeholder: 'e.g. Dear customer, thank you for your message. Regarding your order,',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['complete'],
			},
		},
		default: '',
		typeOptions: {
			rows: 2,
		},
		routing: {
			send: {
				type: 'body',
				property: 'prompt',
			},
		},
	},
];

const editOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		description:
			'ID of a model on your Mammouth API that supports text editing',
		displayOptions: {
			show: {
				operation: ['edit'],
				resource: ['text'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		default: '',
	},
	{
		displayName: 'Text to Edit',
		name: 'input',
		type: 'string',
		placeholder: 'e.g. What day of the wek is it?',
		description: 'The original text that the model will rewrite',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['edit'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'input',
			},
		},
	},
	{
		displayName: 'Instruction',
		name: 'instruction',
		type: 'string',
		placeholder: 'e.g. Fix the spelling mistakes',
		description: 'What to change in the text (e.g. fix spelling, make it more formal, translate to English)',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['edit'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'instruction',
			},
		},
	},
];

const moderateOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		description:
			'ID of a moderation model on your Mammouth API (e.g. omni-moderation-latest). Chat models do not work here.',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['moderate'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		default: '',
	},
	{
		displayName: 'Text to Check',
		name: 'input',
		type: 'string',
		placeholder: 'e.g. My cat is adorable ❤️❤️',
		description:
			'The text to analyze. The output tells, per category (hate, harassment, violence…), whether it is flagged and with which score.',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['moderate'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'input',
			},
		},
	},

	{
		displayName: 'Return Only the Results',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['moderate'],
				resource: ['text'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{$value}}',
						properties: {
							value: '={{ { "data": $response.body.results } }}',
						},
					},
					{
						type: 'rootProperty',
						enabled: '={{$value}}',
						properties: {
							property: 'data',
						},
					},
				],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const sharedOperations: INodeProperties[] = [
	{
		displayName: 'Return Only the Generated Text',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['complete', 'edit'],
				resource: ['text'],
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
									text: (item.json.text as string).trim(),
								},
							};
						});
					},
				],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
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
				operation: ['complete', 'edit'],
				resource: ['text'],
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
					'Maximum length of the generated text, in tokens (1 token ≈ 4 characters). Too low a value cuts the text short.',
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
				displayName: 'Number of Results',
				name: 'n',
				default: 1,
				description:
					'How many alternative results to generate. Each result consumes tokens, so higher values cost more.',
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
					'From 0 to 1. Low values give focused, predictable text; high values give more varied, creative text.',
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

export const textFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                               text:complete                        */
	/* -------------------------------------------------------------------------- */
	...completeOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:edit                             */
	/* -------------------------------------------------------------------------- */
	...editOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:moderate                       */
	/* -------------------------------------------------------------------------- */
	...moderateOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:ALL                                    */
	/* -------------------------------------------------------------------------- */
	...sharedOperations,
];
