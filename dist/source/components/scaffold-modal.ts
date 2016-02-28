import { autoinject } from 'aurelia-dependency-injection';
import { EventAggregator } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { Repository } from 'source/models/Repository';

@autoinject
export class ScaffoldModal {
	private repository: Repository;
	private currentStep: ScaffoldStep = ScaffoldStep.ChooseName;
	private maxStep: ScaffoldStep = ScaffoldStep.ChooseName;
	private errorMessage: string;
	private newRepoName: string;

	constructor(
		private dialogController: DialogController,
		private eventAggregator: EventAggregator) {
			this.eventAggregator.subscribe(Error, (error: Error) => this.showError(error.message));
	}

	protected activate(repository: Repository) {
		this.repository = repository;
		this.reset();
	}

	public repoNamed(newRepoName: string) {
		if (!newRepoName || newRepoName.length <= 0) {
			this.showError("You must choose a name for your new repository.");
			return;
		}

		this.newRepoName = newRepoName;
		this.maxStep = ScaffoldStep.AwaitingReplacements;
		this.currentStep = ScaffoldStep.AwaitingReplacements;
	}

	public showError(message: string) {
		this.errorMessage = message;
		this.maxStep = ScaffoldStep.Error;
		this.currentStep = ScaffoldStep.Error;
	}

	public tryChangeStep(desiredStep: ScaffoldStep) {
		if (desiredStep <= this.maxStep)
			this.currentStep = desiredStep;
		else
			this.currentStep = this.maxStep;
	}

	private reset() {
		this.errorMessage = null;
		this.newRepoName = null;
		this.maxStep = ScaffoldStep.ChooseName;
		this.currentStep = ScaffoldStep.ChooseName;
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
