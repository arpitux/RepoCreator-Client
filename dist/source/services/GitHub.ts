import { OAuth } from 'source/services/OAuth-Auth0';
import { autoinject } from 'aurelia-dependency-injection';
import { HttpClient, RequestBuilder } from 'aurelia-http-client';

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

			return this.httpClient.get(`https://api.github.com/search/repositories?q=${query}`).then(response => (<SearchResults>response.content).items);
		})
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
