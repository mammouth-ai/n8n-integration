import { supplyModel } from '@n8n/ai-node-sdk';
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
		description: 'Mammouth AI chat model (https://mammouth.ai) for AI Agents and Chains',
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
						displayName: 'Avoid Repetition (Frequency Penalty)',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							'From -2 to 2. Higher values make the model less likely to repeat the same words and sentences.',
						type: 'number',
					},
					{
						displayName: 'Maximum Response Length (Tokens)',
						name: 'maxTokens',
						default: -1,
						description:
							'Maximum length of the reply, in tokens (1 token ≈ 4 characters). -1 lets the API decide.',
						type: 'number',
					},
					{
						displayName: 'Retries on Failure',
						name: 'maxRetries',
						default: 2,
						description: 'How many times to retry the request if the API fails',
						type: 'number',
					},
					{
						displayName: 'Encourage New Topics (Presence Penalty)',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							'From -2 to 2. Higher values push the model to talk about new subjects instead of staying on the same ones.',
						type: 'number',
					},
					{
						displayName: 'Output Format',
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
						displayName: 'Creativity (Temperature)',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'From 0 to 2. Low values give focused, predictable answers; high values give more varied, creative answers.',
						type: 'number',
					},
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						default: 60000,
						description: 'Maximum time to wait for the reply, in milliseconds (60000 = 1 minute)',
						type: 'number',
					},
					{
						displayName: 'Word Choice Diversity (Top P)',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'From 0 to 1. Lower values restrict the model to its most likely words. Change this or Creativity, not both.',
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

		return supplyModel(this, {
			type: 'openai',
			baseUrl: credentials.url.trim().replace(/[/]+$/, ''),
			apiKey: credentials.apiKey,
			model,
			...options,
			maxTokens: maxTokens === -1 ? undefined : maxTokens,
			maxRetries: maxRetries ?? 2,
			additionalParams: responseFormat
				? { response_format: { type: responseFormat } }
				: undefined,
		});
	}
}
