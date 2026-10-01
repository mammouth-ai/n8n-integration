import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class MammouthApi implements ICredentialType {
	name = 'mammouthApi';
	displayName = 'Mammouth API';
	icon: Icon = { light: 'file:icons/mammouth.svg', dark: 'file:icons/mammouth.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Base URL',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://api.example.com/v1',
			description: 'Full API base URL, including the version prefix if required (for example /v1)',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			baseURL: '={{ $credentials.url.trim().replace(/[/]+$/, "") }}',
			url: '/models',
		},
	};
}