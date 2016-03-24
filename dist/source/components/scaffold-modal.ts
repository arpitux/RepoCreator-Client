import { computedFrom, BindingEngine } from 'aurelia-binding';
import { autoinject } from 'aurelia-dependency-injection';
import { EventAggregator } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { OAuth } from 'source/services/OAuth-Auth0';
import { RepoCreator } from 'source/services/RepoCreator';
import { Repository } from 'source/models/Repository';
import { Templates } from 'source/services/Templates';
import { RepositoryViewModel } from 'source/view-models/RepositoryViewModel';
import underscore from 'underscore';

@autoinject
export class ScaffoldModal {
	private repository: RepositoryViewModel;
	private currentStep: ScaffoldStep = ScaffoldStep.ChooseName;
	private maxStep: ScaffoldStep = ScaffoldStep.ChooseName;
	private errorMessage: string;
	private newRepoName: string;
	private newRepositoryUrl: string;
	private replacements: Replacement[];
	private processingFavorite: boolean = false;
	private processingSponsor: boolean = false;
	private loginName: string = null;
	private photoUrl: string = null;

	constructor(
		private oAuth: OAuth,
		private repoCreator: RepoCreator,
		private templates: Templates,
		private dialogController: DialogController,
		private bindingEngine: BindingEngine,
		private eventAggregator: EventAggregator) {
			this.bindingEngine.propertyObserver(this, 'newRepoName').subscribe(this.repoNameChanged);
			this.eventAggregator.subscribe(Error, (error: Error) => this.showError(error.message));
	}

	protected activate(repository: RepositoryViewModel) {
		this.repository = repository;
		this.reset();
	}

	public get populatedReplacementCount(): number {
		return this.replacements.filter(replacement => !!replacement.value).length;
	}

	@computedFrom('newRepoName')
	public get hasNewRepoName(): boolean {
		return !!this.newRepoName && this.newRepoName.length > 0;
	}

	public get allReplacementsPopulated(): boolean {
		return this.populatedReplacementCount === this.replacements.length;
	}

	public get loggedInUserName(): string {
		if (!this.isLoggedIn)
			throw new Error(`Attempted to get username but user is not logged in.`);

		// this is terrible, waiting for async binding plugin to work with latest Aurelia to fix
		if (!this.loginName && this.loginName !== "") {
			this.oAuth.gitHubLogin
				.then(loginName => this.loginName = loginName)
				.catch(error => this.eventAggregator.publish(error));
			this.loginName = "";
		}

		return this.loginName;
	}

	public get loggedInPhoto(): string {
		if (!this.isLoggedIn)
			throw new Error(`Attempted to get photo but user is not logged in.`);

		// this is terrible, waiting for async binding plugin to work with latest Aurelia to fix
		if (!this.photoUrl && this.photoUrl !== "") {
			this.oAuth.photoUrl
				.then(photoUrl => this.photoUrl = photoUrl)
				.catch(error => this.eventAggregator.publish(error));
			this.photoUrl = "";
		}

		return this.photoUrl;
	}

	public get isLoggedIn(): boolean {
		return this.oAuth.isLoggedOrLoggingIn;
	}

	public login = (): void => {
		// force a login
		// this is terrible, waiting for async binding plugin to work with latest Aurelia to fix
		this.oAuth.gitHubLogin
			.then(loginName => this.loginName = loginName)
			.catch(error => this.eventAggregator.publish(error));
		this.oAuth.photoUrl
			.then(photoUrl => this.photoUrl = photoUrl)
			.catch(error => this.eventAggregator.publish(error));
		this.loginName = "";
		this.photoUrl = "";
	}

	public logout = (): void => {
		this.oAuth.logout();
		this.loginName = null;
		this.photoUrl = null;
	}

	public addFavorite = (): void => {
		if (this.repository.isFavorite) {
			this.templates.fetchFavorites();
			return;
		}
		this.processingFavorite = true;
		this.templates.addFavorite(this.repository)
			.then(() => this.processingFavorite = false)
			.catch(() => this.processingFavorite = false);
	}

	public removeFavorite = (): void => {
		if (!this.repository.isFavorite) {
			this.templates.fetchFavorites();
			return;
		}
		this.processingFavorite = true;
		this.templates.removeFavorite(this.repository)
			.then(() => this.processingFavorite = false)
			.catch(() => this.processingFavorite = false);
	}

	public sponsor = (): void => {
		if (this.repository.isMySponsored) {
			this.templates.fetchSponsored();
			return;
		}
		this.processingSponsor = true;
		this.templates.sponsor(this.repository)
			.then(() => this.processingSponsor = false)
			.catch(() => this.processingSponsor = false);
	}

	public unsponsor = (): void => {
		if (!this.repository.isMySponsored) {
			this.templates.fetchSponsored();
			return;
		}
		this.templates.cancelSponsorship(this.repository)
			.then(() => this.processingSponsor = false)
			.catch(() => this.processingSponsor = false);
	}

	public repoNamed = () => {
		this.advanceStep(ScaffoldStep.AwaitingReplacements);
	}

	public repoNameChanged = (newValue: string, oldValue: string) => {
		if (!this.replacements)
			return;

		this.replacements.forEach(replacement => {
			if (/git.?hub.?repo/i.test(replacement.friendlyName))
				replacement.value = newValue;
		});
	}

	public createNewRepository = () => {
		this.oAuth.gitHubLogin.then(gitHubLogin => {
			this.advanceStep(ScaffoldStep.AwaitingCreation);
			let replacementsMap = underscore(this.replacements).reduce((map: any, replacement: Replacement) => {
				map[replacement.name] = replacement.value;
				return map;
			}, {});
			this.newRepositoryUrl = `https://github.com/${gitHubLogin}/${this.newRepoName}`
			return this.repoCreator.createRepo(this.repository.repository.gitHubMetadata.owner, this.repository.repository.gitHubMetadata.name, gitHubLogin, this.newRepoName, replacementsMap)
		}).then(result => {
			this.advanceStep(ScaffoldStep.Complete);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public showError = (message: string) => {
		this.errorMessage = message;
		this.maxStep = ScaffoldStep.Error;
		this.tryChangeStep(ScaffoldStep.Error);
	}

	public tryChangeStep = (desiredStep: ScaffoldStep) => {
		if (desiredStep <= this.maxStep)
			this.currentStep = desiredStep;
		else
			this.currentStep = this.maxStep;

		if (this.currentStep >= ScaffoldStep.EnterReplacements)
			this.fillInReplacementsNeedingAuthentication();
	}

	private advanceStep = (suggestedStep: ScaffoldStep) => {
		if (this.maxStep <= suggestedStep)
			this.maxStep = suggestedStep;
		this.tryChangeStep(this.maxStep);
	}

	private reset = () => {
		this.errorMessage = null;
		this.newRepoName = null;
		this.newRepositoryUrl = null;
		this.replacements = null;
		this.maxStep = ScaffoldStep.ChooseName;
		this.currentStep = ScaffoldStep.ChooseName;

		this.repoCreator.findKeys(this.repository.repository.gitHubMetadata.owner, this.repository.repository.gitHubMetadata.name).then(keys => {
			this.replacements = underscore(keys)
				.map((key: string) => {
					let replacement = new Replacement(key, '');
					if (/current.?year/i.test(replacement.friendlyName))
						replacement.value = new Date(Date.now()).getUTCFullYear().toString();
					return replacement;
				});
			this.repoNameChanged(this.newRepoName, this.newRepoName);
			this.maxStep = ScaffoldStep.EnterReplacements;
			if (this.currentStep >= ScaffoldStep.AwaitingReplacements)
				this.tryChangeStep(ScaffoldStep.EnterReplacements);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private fillInReplacementsNeedingAuthentication() {
		this.replacements.forEach(replacement => {
			if (/git.?hub.?owner/i.test(replacement.friendlyName))
				this.oAuth.gitHubLogin.then(login => replacement.value = login);
		});
	}

	// necessary for Aurelia templates to be able to reference the enum
	private ScaffoldStep: any = ScaffoldStep;
}

enum ScaffoldStep {
	Error,
	ChooseName,
	AwaitingReplacements,
	EnterReplacements,
	AwaitingCreation,
	Complete,
}

export class Replacement {
	constructor(
		public name: string,
		public value: string
	) {}

	@computedFrom('name')
	get friendlyName(): string {
		let regex = /magic[_\-\.](.*?)[_\-\.]magic/;
		let match = regex.exec(this.name);
		if (!match)
			return this.name;

		return match[1];
	}
}
