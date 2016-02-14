import { decompressFromEncodedURIComponent, compressToEncodedURIComponent } from "lz-string";
import { computedFrom } from 'aurelia-binding';
import { autoinject } from 'aurelia-dependency-injection';
import { Router } from 'aurelia-router';
import { EventAggregator } from 'aurelia-event-aggregator';
import { RepoCreator } from 'source/services/RepoCreator';
import { OAuth } from 'source/services/OAuth-Auth0';
import { ProgressModal } from 'source/components/progress-modal';
import { CompleteModal } from 'source/components/complete-modal';
import { Validation, ValidationGroup } from 'aurelia-validation';
import underscore from 'underscore';
import 'bootstrap';

@autoinject
export class EnterReplacements {
	activated: boolean = false;
	templateOwner: string = null;
	templateName: string = null;
	seed: string[] = null;
	destinationName: string = null;
	replacements: Replacement[] = null;
	progressModal: ProgressModal = null;
	completeModal: CompleteModal = null;
	validationGroup: ValidationGroup;

	constructor(
		private router: Router,
		private eventAggregator: EventAggregator,
		private repoCreator: RepoCreator,
		private oAuth: OAuth,
		private validation: Validation
	) { }

	public activate(parameters: any) {
		// TODO: work-around for https://github.com/aurelia/history/issues/2
		if (this.activated)
			return;

		this.templateOwner = parameters.templateOwner;
		this.templateName = parameters.templateName;
		this.destinationName = parameters.destinationName;
		this.replacements = this.tryGetReplacementsFromQueryStringKeys(parameters.keys);
		if (!this.replacements)
			this.findKeys();

		this.activated = true;
	}

	protected attached() {
		this.setupValidation();
	}

	protected get canCreate(): boolean {
		if (!this.replacements)
			return false;
		for (var i = 0; i < this.replacements.length; ++i)
			if (!this.replacements[i].value)
				return false;

		return true;
	}

	protected get gitHubLink() {
		return `https://github.com/${this.templateOwner}/${this.templateName}/`;
	}

	protected onChanged = () => {
		// setImmediate to avoid a jquery/Aurelia bug resulting in a console error message
		setImmediate(() => {
			this.updateQueryString();
		});
	}

	protected createRepo = () => {
		this.validationGroup.validate().then(validationResult => {
			let replacementsMap = underscore(this.replacements).reduce((map: any, replacement: Replacement) => {
				map[replacement.name] = replacement.value;
				return map;
			}, {});
			let promise = this.repoCreator.createRepo(this.templateOwner, this.templateName, this.destinationName, replacementsMap);
			promise.then((result: string) => {
				return this.completeModal.show(result)
			}).catch((error: Error) => {
				this.eventAggregator.publish(error)
			});
			this.progressModal.show(promise);
		});
	}

	private updateQueryString(): void {
		let keys = underscore(this.replacements).map((x: any) => x.name);
		let keysJson = JSON.stringify(keys);
		let keysSerialized = compressToEncodedURIComponent(keysJson);
		let queryString = `keys=${keysSerialized}`;
		this.router.navigate(`replacements/${this.templateOwner}/${this.templateName}/${this.destinationName}?${queryString}`, { trigger: false });
	}

	private findKeys() {
		this.repoCreator.findKeys(this.templateOwner, this.templateName).then((results: string[]) => {
			this.replacements = this.keysToReplacements(results);
			this.onChanged();
			this.setupValidation();
		}).catch((error: Error) => {
			// TODO: pop-up error and then navigate back to choose-repository
			this.eventAggregator.publish(error);
		});
	}

	private tryGetReplacementsFromQueryStringKeys(serializedKeys: string): Replacement[] {
		if (!serializedKeys)
			return null;

		try {
			let deserializedKeys = decompressFromEncodedURIComponent(serializedKeys);
			let keys = JSON.parse(deserializedKeys);
			return this.keysToReplacements(keys);
		}
		catch (error) {
			return null;
		}
	}

	private keysToReplacements(keys: string[]): Replacement[] {
		return underscore(keys)
			.map((key: string) => {
				let replacement = new Replacement(key, '');
				if (/git.?hub.?owner/i.test(replacement.friendlyName))
					this.oAuth.gitHubLogin.then(login => replacement.value = login);
				if (/git.?hub.?repo/i.test(replacement.friendlyName))
					replacement.value = this.destinationName;
				if (/current.?year/i.test(replacement.friendlyName))
					replacement.value = new Date(Date.now()).getUTCFullYear().toString();
				return replacement;
			});
	}

	private setupValidation() {
		// any time the array of replacements changes we need to re-bind validation so we get the magic highlights
		if (this.validationGroup)
			this.validationGroup.destroy();
		// setImmediate because we need to wait until after the DOM has the new elements before we hook up validation
		setImmediate(() => {
			this.validationGroup = this.validation.on(this);
			if (this.replacements)
				this.replacements.forEach((replacement, index) => {
					this.validationGroup
						.ensure(`replacements.${index}.value`)
						.isNotEmpty();
			});
		});
	}
}

// must be defined second in the file so Aurelia doesn't think it is the view-model
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
