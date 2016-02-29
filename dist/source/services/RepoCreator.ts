import { autoinject } from 'aurelia-dependency-injection';
import { HttpClient, RequestBuilder, HttpResponseMessage } from 'aurelia-http-client';
import { OAuth } from 'source/services/OAuth-Auth0';
import { StripeCheckout, StripeToken } from 'source/services/StripeCheckout';
import { Repository } from 'source/models/Repository';
import { SponsoredRepository } from 'source/models/SponsoredRepository';
import { Request as FindKeysRequest, Progress as FindKeysProgress, Step as FindKeysProgressStep } from 'source/models/FindKeys';
import { Request as CreateRepoRequest, Progress as CreateRepoProgress, Step as CreateRepoProgressStep } from 'source/models/CreateRepo';
import underscore from 'underscore';

let baseUri: string = 'https://repocreator-api.zoltu.io';

@autoinject
export class RepoCreator {
	httpClient: HttpClient = new HttpClient();

	constructor(
		private oAuth: OAuth,
		private stripeCheckout: StripeCheckout) {
		this.httpClient.configure((builder: RequestBuilder) => builder['withHeader']('Accept', 'application/json'));
		this.httpClient.configure((builder: RequestBuilder) => builder['withHeader']('Content-Type', 'application/json'));
	}

	findKeys(repoOwner: string, repoName: string): Promise<string[]> {
		return this.oAuth.maybeJwtToken.then(jwtToken => {
			if (jwtToken)
				this.httpClient.configure(builder => builder['withHeader']('Authorization', `Bearer ${jwtToken}`));
			let repository = new Repository('GitHub', repoOwner, repoName);
			let request = new FindKeysRequest(repository);
			return new Promise((resolve: (result: string[]) => void, reject: (error: Error) => void) => new FindKeys(this.httpClient, this.oAuth, request, resolve, reject).execute());
		});
	}

	createRepo(templateRepoOwner: string, templateRepoName: string, destinationRepoName: string, replacements: any): Promise<string> {
		return this.oAuth.jwtToken.then(jwtToken => this.oAuth.gitHubLogin.then(login => {
			if (jwtToken)
				this.httpClient.configure(builder => builder['withHeader']('Authorization', `Bearer ${jwtToken}`));
			let templateRepository = new Repository('GitHub', templateRepoOwner, templateRepoName);
			let destinationRepository = new Repository('GitHub', login, destinationRepoName);
			let request = new CreateRepoRequest(destinationRepository, templateRepository, replacements);
			return new Promise((resolve: (result: any) => void, reject: (error: Error) => void) => new CreateRepo(this.httpClient, this.oAuth, request, resolve, reject).execute());
		}));
	}

	getPopular(): Promise<Repository[]> {
		return this.httpClient.createRequest(`${baseUri}/api/popular/`)
			.asGet()
			.withHeader('Accept', 'application/json')
			.withHeader('Content-Type', 'application/json')
			.send()
			.then(response => underscore(response.content).map(item => Repository.deserialize(item)));
	}

	getSponsored(): Promise<Repository[]> {
		return this.httpClient.createRequest(`${baseUri}/api/sponsored/`)
			.asGet()
			.withHeader('Accept', 'application/json')
			.withHeader('Content-Type', 'application/json')
			.send()
			.then(response => underscore(response.content).map(item => Repository.deserialize(item)));
	}

	sponsor(repository: Repository): Promise<Repository[]> {
		return this.oAuth.jwtToken.then(jwtToken => this.oAuth.gitHubEmail.then(email => {
			return this.stripeCheckout.popup(email, 'Sponsor a repository so anyone can use it as a template!', 500, 'Sponsor');
		}).then(value => {
			// TODO: show processing
			let paymentToken = value.id;
			this.httpClient.configure(builder => builder['withHeader']('Authorization', 'Bearer ' + jwtToken));
			return this.httpClient.put(`${baseUri}/api/sponsored/add/`, { 'payment_token': paymentToken, 'repository': repository })
		}).then((response: HttpResponseMessage) => {
			return underscore(response.content).map((item: any) => Repository.deserialize(item))
		}));
	}

	getFavorites(): Promise<Repository[]> {
		return this.oAuth.jwtToken.then(jwtToken => {
			return this.httpClient.createRequest(`${baseUri}/api/favorites/`)
				.asGet()
				.withHeader('Authorization', `Bearer ${jwtToken}`)
				.withHeader('Accept', 'application/json')
				.withHeader('Content-Type', 'application/json')
				.send();
		}).then(response => {
			return underscore(response.content).map(item => Repository.deserialize(item));
		});
	}

	addFavorite(repository: Repository): Promise<Repository[]> {
		return this.oAuth.jwtToken.then(jwtToken => {
			return this.httpClient.createRequest(`${baseUri}/api/favorites/${repository.owner}/${repository.name}/`)
				.asPut()
				.withHeader('Authorization', `Bearer ${jwtToken}`)
				.withHeader('Accept', 'application/json')
				.withHeader('Content-Type', 'application/json')
				.send();
		}).then(response => {
			return underscore(response.content).map(item => Repository.deserialize(item));
		});
	}

	removeFavorite(repository: Repository): Promise<Repository[]> {
		return this.oAuth.jwtToken.then(jwtToken => {
			return this.httpClient.createRequest(`${baseUri}/api/favorites/${repository.owner}/${repository.name}/`)
				.asDelete()
				.withHeader('Authorization', `Bearer ${jwtToken}`)
				.withHeader('Accept', 'application/json')
				.withHeader('Content-Type', 'application/json')
				.send();
		}).then(response => {
			return underscore(response.content).map(item => Repository.deserialize(item));
		});
	}

	getMyRepositories(): Promise<SponsoredRepository[]> {
		return this.oAuth.jwtToken.then(jwtToken => {
			return this.httpClient.createRequest(`${baseUri}/api/sponsored/mine/`)
				.asGet()
				.withHeader('Authorization', `Bearer ${jwtToken}`)
				.withHeader('Accept', 'application/json')
				.withHeader('Content-Type', 'application/json')
				.send();
		}).then(response => {
			return underscore(response.content).map(item => SponsoredRepository.deserialize(item));
		});
	}

	cancelSponsorship(repository: Repository): Promise<HttpResponseMessage> {
		return this.oAuth.jwtToken.then(jwtToken => {
			return this.httpClient.createRequest(`${baseUri}/api/sponsored/cancel/`)
				.asDelete()
				.withContent(repository)
				.withHeader('Authorization', `Bearer ${jwtToken}`)
				.withHeader('Accept', 'application/json')
				.withHeader('Content-Type', 'application/json')
				.send();
		});
	}
}

class CreateRepo {
	constructor(
		private httpClient: HttpClient,
		private oAuth: OAuth,
		private request: CreateRepoRequest,
		private resolve: (result: any) => void,
		private reject: (error: Error) => void
	) {}

	execute(): void {
		this.httpClient.post(`${baseUri}/api/create_repository`, this.request)
			.then((x: HttpResponseMessage) => this.success(x), (x: HttpResponseMessage) => this.failure(x));
	}

	success(httpResponseMessage: HttpResponseMessage): void {
		let token = <string>httpResponseMessage.content;
		this.progress(token);
	}

	failure(httpResponseMessage: HttpResponseMessage): void {
		if (httpResponseMessage.statusCode === 403) {
			this.reject(new Error(`Unauthorized or authorization expired.  You have been logged out, please try again.`));
			this.oAuth.logout();
		}
		else
			this.reject(new Error(`Failed to initiate repository creation: ${httpResponseMessage.content.Message}`));
	}

	progress(token: string): void {
		this.httpClient.get(`${baseUri}/api/create_repository/progress/${token}`)
			.then((x: HttpResponseMessage) => this.progressSuccess(x), (x: HttpResponseMessage) => this.progressFailure(x));
	}

	progressSuccess(httpResponseMessage: HttpResponseMessage): void {
		let progress = CreateRepoProgress.deserialize(httpResponseMessage.content);
		switch (progress.current_step) {
			case CreateRepoProgressStep.Succeeded:
				this.resolve(progress.success_result);
				break;
			case CreateRepoProgressStep.Failed:
				this.reject(new Error(progress.failure_reason));
				break;
			default:
				setTimeout(() => this.progress(progress.progress_token), 1000);
				break;
		}
	}

	progressFailure(httpResponseMessage: HttpResponseMessage): void {
		if (httpResponseMessage.statusCode === 403) {
			this.reject(new Error(`Unauthorized or authorization expired.  You have been logged out, please try again.`));
			this.oAuth.logout();
		}
		else
			this.reject(new Error(`Failed to get progress update for repository creation: ${httpResponseMessage.content.Message}`));
	}
}

class FindKeys {
	constructor(
		private httpClient: HttpClient,
		private oAuth: OAuth,
		private request: FindKeysRequest,
		private resolve: (result: string[]) => void,
		private reject: (error: Error) => void
	) {}

	execute(): void {
		this.httpClient.post(`${baseUri}/api/find_keys_in_repo`, this.request)
			.then((x: HttpResponseMessage) => this.success(x), (x: HttpResponseMessage) => this.failure(x));
	}

	success(httpResponseMessage: HttpResponseMessage): void {
		let token = httpResponseMessage.content;
		this.progress(token);
	};

	failure(httpResponseMessage: HttpResponseMessage): void {
		if (httpResponseMessage.statusCode === 403) {
			this.reject(new Error(`Unauthorized or authorization expired.  You have been logged out, please try again.`));
			this.oAuth.logout();
		}
		else
			this.reject(new Error(`Failed to initiate replacement finding: ${httpResponseMessage.content.Message}`));
	};

	progress(token: string): void {
		this.httpClient.get(`${baseUri}/api/find_keys_in_repo/progress/${token}`)
			.then((x: HttpResponseMessage) => this.progressSuccess(x), (x: HttpResponseMessage) => this.progressFailure(x));
	};

	progressSuccess(httpResponseMessage: HttpResponseMessage): void {
		let progress = FindKeysProgress.deserialize(httpResponseMessage.content);
		switch (progress.current_step) {
			case FindKeysProgressStep.Succeeded:
				this.resolve(progress.success_result);
				break;
			case FindKeysProgressStep.Failed:
				this.reject(new Error(progress.failure_reason));
				break;
			default:
				setTimeout(() => this.progress(progress.progress_token), 1000);
				break;
		}
	};

	progressFailure(httpResponseMessage: HttpResponseMessage): void {
		if (httpResponseMessage.statusCode === 403) {
			this.reject(new Error(`Unauthorized or authorization expired.  You have been logged out, please try again.`));
			this.oAuth.logout();
		}
		else
			this.reject(new Error(`Failed to get progress update: ${httpResponseMessage.content.Message}`));
	};
}
