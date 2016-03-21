import { autoinject } from 'aurelia-dependency-injection';
import { HttpClient, RequestBuilder, HttpResponseMessage } from 'aurelia-http-client';
import { OAuth } from 'source/services/OAuth-Auth0';
import { StripeCheckout, StripeToken } from 'source/services/StripeCheckout';
import { RepositoryKey, Repository, RepositoryRepoCreatorMetadata } from 'source/models/Repository';
import { Request as FindKeysRequest, Progress as FindKeysProgress, Step as FindKeysProgressStep } from 'source/models/FindKeys';
import { Request as CreateRepoRequest, Progress as CreateRepoProgress, Step as CreateRepoProgressStep } from 'source/models/CreateRepo';
import underscore from 'underscore';

let baseUri: string = 'https://repocreator-api.zoltu.io';
//let baseUri: string = 'http://localhost:64736';

@autoinject
export class RepoCreator {
	httpClient: HttpClient = new HttpClient();

	constructor(
		private oAuth: OAuth,
		private stripeCheckout: StripeCheckout) {
		this.httpClient.configure((builder: RequestBuilder) => builder.withHeader('Accept', 'application/json'));
		this.httpClient.configure((builder: RequestBuilder) => builder.withHeader('Content-Type', 'application/json'));
	}

	findKeys(repositoryOwner: string, repositoryName: string): Promise<string[]> {
		return this.oAuth.maybeJwtToken.then(jwtToken => {
			if (jwtToken)
				this.httpClient.configure(builder => builder.withHeader('Authorization', `Bearer ${jwtToken}`));
			let request = new FindKeysRequest(repositoryOwner, repositoryName);
			return new Promise((resolve: (result: string[]) => void, reject: (error: Error) => void) => new FindKeys(this.httpClient, this.oAuth, request, resolve, reject).execute());
		});
	}

	createRepo(templateRepositoryOwner: string, templateRepositoryName: string, destinationRepositoryOwner: string, destinationRepositoryName: string, replacements: any): Promise<string> {
		return this.oAuth.jwtToken.then(jwtToken => this.oAuth.gitHubLogin.then(login => {
			if (jwtToken)
				this.httpClient.configure(builder => builder.withHeader('Authorization', `Bearer ${jwtToken}`));
			let request = new CreateRepoRequest(templateRepositoryOwner, templateRepositoryName, destinationRepositoryOwner, destinationRepositoryName, replacements);
			return new Promise((resolve: (result: any) => void, reject: (error: Error) => void) => new CreateRepo(this.httpClient, this.oAuth, request, resolve, reject).execute());
		}));
	}

	getRepositoryMetadata(repositoryKey: RepositoryKey): Promise<RepositoryRepoCreatorMetadata> {
		return this.submitRequestWithMaybeAuthentication(() => {
			return Promise.resolve(
				this.httpClient.createRequest(`${baseUri}/api/repository/${repositoryKey.provider}/${repositoryKey.id}`)
				.asGet());
		}).then((response: HttpResponseMessage) => {
			return RepositoryRepoCreatorMetadata.deserialize(response.content);
		}).catch((error: Error) => {
			if (error.name === '404')
				return null;
			throw new Error(`Failed to get metadata about repository from RepoCreator (${repositoryKey.id}).  ${error.toString()}`);
		});
	}

	getPopular(): Promise<Repository[]> {
		return this.submitRequestWithMaybeAuthentication(() => {
			return Promise.resolve(
				this.httpClient.createRequest(`${baseUri}/api/popular/`)
					.asGet());
		}).then(response => {
			return underscore(response.content).map(item => Repository.deserializeFromRepoCreator(item));
		}).catch((error: Error) => {
			throw new Error(`Failed to popular repositories.  ${error.toString()}`);
		});
	}

	getFavorites(): Promise<Repository[]> {
		return this.submitRequestWithAuthentication(() => {
			return Promise.resolve(this.httpClient.createRequest(`${baseUri}/api/favorites/`)
				.asGet());
		}).then(response => {
			return underscore(response.content).map(item => Repository.deserializeFromRepoCreator(item));
		}).catch((error: Error) => {
			throw new Error(`Failed to get favorite repositories.  ${error.toString()}`);
		});
	}

	addFavorite(repositoryKey: RepositoryKey): Promise<Repository[]> {
		return this.submitRequestWithAuthentication(() => {
			return Promise.resolve(
				this.httpClient.createRequest(`${baseUri}/api/favorites/${repositoryKey.provider}/${repositoryKey.id}/`)
					.asPut());
		}).then(response => {
			return underscore(response.content).map(item => Repository.deserializeFromRepoCreator(item));
		}).catch((error: Error) => {
			throw new Error(`Failed to favorite repository (${repositoryKey.id}).  ${error.toString()}`);
		});
	}

	removeFavorite(repositoryKey: RepositoryKey): Promise<Repository[]> {
		return this.submitRequestWithAuthentication(() => {
			return Promise.resolve(
				this.httpClient.createRequest(`${baseUri}/api/favorites/${repositoryKey.provider}/${repositoryKey.id}/`)
					.asDelete());
		}).then(response => {
			return underscore(response.content).map(item => Repository.deserializeFromRepoCreator(item));
		}).catch((error: Error) => {
			throw new Error(`Failed to un-favorite repository (${repositoryKey.id}).  ${error.toString()}`);
		});
	}

	getSponsored(): Promise<Repository[]> {
		return this.submitRequestWithMaybeAuthentication(() => {
			return Promise.resolve(
				this.httpClient.createRequest(`${baseUri}/api/sponsored/`)
					.asGet());
		}).then(response => {
			return underscore(response.content).map(item => Repository.deserializeFromRepoCreator(item));
		}).catch((error: Error) => {
			throw new Error(`Failed to get sponsored repositories.  ${error.toString()}`);
		});
	}

	sponsor(repositoryKey: RepositoryKey): Promise<Repository[]> {
		return this.submitRequestWithAuthentication(() => {
			return this.oAuth.gitHubEmail.then(email => {
				return this.stripeCheckout.popup(email, 'Sponsor a repository so anyone can use it as a template!', 500, 'Sponsor').then(stripeToken => {
					return this.httpClient.createRequest(`${baseUri}/api/sponsored/${repositoryKey.provider}/${repositoryKey.id}`)
						.asPut()
						.withContent({ 'payment_token': stripeToken.id });
				});
			});
		}).then((response: HttpResponseMessage) => {
			return underscore(response.content).map((item: any) => Repository.deserializeFromRepoCreator(item))
		}).catch((error: Error) => {
			throw new Error(`Failed to sponsored repository (${repositoryKey.id}).  ${error.toString()}`);
		});
	}

	cancelSponsorship(repositoryKey: RepositoryKey): Promise<HttpResponseMessage> {
		return this.submitRequestWithAuthentication(() => {
			return Promise.resolve(
				this.httpClient.createRequest(`${baseUri}/api/sponsored/${repositoryKey.provider}/${repositoryKey.id}`)
					.asDelete()
					.withContent(repositoryKey));
		}).catch((error: Error) => {
			throw new Error(`Failed to cancel sponsorship (${repositoryKey.id}).  ${error.toString()}`);
		});
	}

	private submitRequestWithAuthentication(requestBuilderSupplier: () => Promise<RequestBuilder>): Promise<HttpResponseMessage> {
		return this.logoutAndRetryOnForbidden(() => {
			return this.oAuth.jwtToken.then(jwtToken => {
				return requestBuilderSupplier().then(requestBuilder => {
					return requestBuilder
						.withHeader('Authorization', `Bearer ${jwtToken}`)
						.withHeader('Accept', 'application/json')
						.withHeader('Content-Type', 'application/json');
				});
			});
		});
	}

	private submitRequestWithMaybeAuthentication(requestBuilderSupplier: () => Promise<RequestBuilder>): Promise<HttpResponseMessage> {
		return this.logoutAndRetryOnForbidden(() => {
			return this.oAuth.maybeJwtToken.then(maybeJwtToken => {
				return requestBuilderSupplier().then(requestBuilder => {
					if (maybeJwtToken)
						return requestBuilder
							.withHeader('Authorization', `Bearer ${maybeJwtToken}`)
							.withHeader('Accept', 'application/json')
							.withHeader('Content-Type', 'application/json');
					else
						return requestBuilder
							.withHeader('Accept', 'application/json')
							.withHeader('Content-Type', 'application/json');
				})
			});
		});
	}

	private logoutAndRetryOnForbidden(requestBuilderSupplier: () => Promise<RequestBuilder>): Promise<HttpResponseMessage> {
		let getError = (errorOrResponse: Error|HttpResponseMessage): Error => {
			if (errorOrResponse instanceof Error) {
				if (errorOrResponse.message === 'Popup closed')
					return new Error('You must be logged in to complete this action.');
				else
					return errorOrResponse;
			} else if (errorOrResponse instanceof HttpResponseMessage) {
				let error = new Error();
				if (errorOrResponse.content)
					error.message = errorOrResponse.content.Message;
				error.name = errorOrResponse.statusCode.toString();
				return error;
			} else {
				return new Error(`Unknown error.  ${errorOrResponse.toString()}`)
			}
		};

		return requestBuilderSupplier().then(requestBuilder => {
				return requestBuilder.send();
			}).catch((errorOrResponse: Error|HttpResponseMessage) => {
				if (errorOrResponse instanceof HttpResponseMessage && errorOrResponse.statusCode === 403) {
					this.oAuth.logout();
					return requestBuilderSupplier().then(requestBuilder => {
						return requestBuilder.send()
					}).catch((errorOrResponse: Error|HttpResponseMessage) => {
						throw getError(errorOrResponse);
					});
				} else {
					throw getError(errorOrResponse);
				}
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
