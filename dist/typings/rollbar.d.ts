declare module Rollbar {
	export interface Configuration {
		payload?: any;
		enabled?: boolean;
		accessToken?: string;
		ignoredMessages?: string[];
		captureUncaught?: boolean;
		verbose?: boolean;
		async?: boolean;
		rollbarJsUrl?: string;
	}

	export interface Rollbar {
		critical(message: string, object?: any): void;
		error(message: string, object?: any): void;
		warning(message: string, object?: any): void;
		info(message: string, object?: any): void;
		debug(message: string, object?: any): void;

		configure(config: Configuration): void;
	}
}

declare var Rollbar: Rollbar.Rollbar;