import { autoinject } from 'aurelia-dependency-injection';
import { HttpClient, RequestBuilder, HttpResponseMessage } from 'aurelia-http-client';
import { OAuth } from 'source/services/OAuth-Auth0';

@autoinject
export class GitHub {
	httpClient: HttpClient = new HttpClient();

	constructor(
		private oAuth: OAuth
	) {
		this.httpClient.configure((builder: RequestBuilder) => builder['withHeader']('Accept', 'application/json'));
		this.httpClient.configure((builder: RequestBuilder) => builder['withHeader']('Content-Type', 'application/json'));
	}

	public search(query: string): Promise<SearchResult[]> {
		return this.oAuth.maybeGitHubAuthToken.then(maybeGitHubAuthToken => {
			if (maybeGitHubAuthToken)
				this.httpClient.configure(builder => builder['withHeader']('Authorization', `token ${maybeGitHubAuthToken}`));

			return this.httpClient.get(`https://api.github.com/search/repositories?q=${query}`).then(response => {
				if (!response.isSuccess)
					throw response;
				return (<SearchResults>response.content).items;
			}).catch ((response: HttpResponseMessage) => {
				if (response.statusCode === 403)
					return this.oAuth.gitHubLogin.then(username => this.search(query));
				else
					throw new Error(`Failed to search GitHub (${response.statusCode}): ${response.content}`);
			});
		});
	}

	public getRepository(id: string): Promise<SearchResult> {
		return this.oAuth.maybeGitHubAuthToken.then(maybeGitHubAuthToken => {
			if (maybeGitHubAuthToken)
				this.httpClient.configure(builder => builder['withHeader']('Authorization', `token ${maybeGitHubAuthToken}`));

			return this.httpClient.get(`https://api.github.com/repositories/${id}`).then(response => {
				if (!response.isSuccess)
					throw response;
				return <SearchResult>response.content
			}).catch ((response: HttpResponseMessage) => {
				if (!(response instanceof HttpResponseMessage))
					if (response instanceof Error)
						throw response;
					else
						throw new Error(`Caught an error that wasn't an HttpResponseMessage or an Error: ${response}`);
				if (response.statusCode === 403)
					return this.oAuth.gitHubLogin.then(username => this.getRepository(id));
				throw new Error(`Failed to get metadata about repository from GitHub (${response.statusCode}): ${response.content}`);
			});
		});
	}
}

export interface SearchResults {
	total_count: number;
	incomplete_results: boolean;
	items: SearchResult[];
}

export interface SearchResult {
	id: number;
	name: string;
	full_name: string;
	owner: Owner;
	private: boolean;
	html_url: string;
	description: string;
	fork: boolean;
	url: string;
	created_at: string;
	updated_at: string;
	pushed_at: string;
	homepage: string;
	size: number;
	stargazers_count: number;
	watchers_count: number;
	language: string;
	forks_count: number;
	open_issues_count: number;
	master_branch: string;
	default_branch: string;
	score: number
}

export interface Owner {
	login: string;
	id: number;
	avatar_url: string;
	gravatar_id: string;
	url: string;
	received_events_url: string;
	type: string;
}
