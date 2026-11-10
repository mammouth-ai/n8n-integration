import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { chatFields, chatOperations } from './ChatDescription';
import { imageFields, imageOperations } from './ImageDescription';
import { textFields, textOperations } from './TextDescription';

export class MammouthAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mammouth',
		name: 'mammouth',
		icon: { light: 'file:icons/mammouth.svg', dark: 'file:icons/mammouth.dark.svg' },
		group: ['transform'],
		version: [1, 1.1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Chat, generate text and create or analyze images with Mammouth AI (https://mammouth.ai)',
		defaults: {
			name: 'Mammouth',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				description:
					'What you want to work with. Get your API key on <a href="https://mammouth.ai" target="_blank">mammouth.ai</a>.',
				options: [
					{
						name: 'Chat (Recommended for Text Generation)',
						value: 'chat',
						description:
							'Ask a question or give an instruction and get a written answer: write an email, summarize, translate, classify, extract data…',
					},
					{
						name: 'Image',
						value: 'image',
						description:
							'Generate a picture from a description, or let a model read and describe images (e.g. email attachments)',
					},
					{
						name: 'Text (Advanced)',
						value: 'text',
						description:
							'Older text tools: raw text continuation, instruction-based editing and unsafe content detection. For most text tasks, use Chat instead.',
					},
				],
				default: 'chat',
			},

			...chatOperations,
			...chatFields,

			...imageOperations,
			...imageFields,

			...textOperations,
			...textFields,
		],
	};
}
