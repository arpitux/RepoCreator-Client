export function configure(aurelia: any) {
	aurelia.use
		.standardConfiguration()
		.developmentLogging()
		.plugin('aurelia-computed')
		.plugin('aurelia-validation');

	aurelia.start().then((x: any) => x.setRoot('source/repo-creator/repository-chooser'));
}
