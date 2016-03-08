import { RepositoryKey } from 'source/models/Repository';

export class Request {
	constructor(
		public repository_owner: string,
		public repository_name: string
	) {}
}

export class Progress {
	constructor(
		public progress_token: string,
		public current_step: Step,
		public success_result: string[],
		public failure_reason: string
	) {}

	public static deserialize(input: any): Progress {
		return new Progress(
			input.progress_token,
			Step.deserialize(input.current_step),
			input.success_result,
			input.failure_reason
		);
	}
}

export enum Step {
	Queued,
	Processing,
	Succeeded,
	Failed
}

export module Step {
	export var deserialize = (input: string): Step => {
		switch (input) {
			case 'Queued':
				return Step.Queued;
			case 'Processing':
				return Step.Processing;
			case 'Succeeded':
				return Step.Succeeded;
			case 'Failed':
				return Step.Failed;
			default:
				throw new Error(`Unknown FindKeys Progress Step ${input}.`);
		}
	}
}
