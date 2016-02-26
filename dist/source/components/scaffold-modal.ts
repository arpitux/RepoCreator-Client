import { autoinject } from 'aurelia-dependency-injection';
import { DialogController } from 'aurelia-dialog';
import { Repository } from 'source/models/Repository';

@autoinject
export class ScaffoldModal {
	private repository: Repository;

	constructor(private dialogController: DialogController) {
	}

	activate(repository: Repository) {
		this.repository = repository;
	}
}
