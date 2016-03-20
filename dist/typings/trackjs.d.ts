declare module TrackJs {
	interface ConsoleEvent {
		timestamp?: string;
		severity?: string;
		message?: string;
	}

	interface CustomerInformation {
		application?: string;
		correlationId?: string;
		sessionId?: string;
		token?: string;
		userId?: string;
		version?: string;
	}

	interface EnvironmentInformation {
		age?: number;
		dependencies?: any;
		userAgent?: string;
		viewportHeight?: number;
		viewportWidth?: number;
	}

	interface NetworkEvent {
		startedOn?: string;
		method?: string;
		url?: string;
		completedOn?: string;
		statusCode?: number;
		statusText?: string;
	}

	interface UserAction {
		timestamp?: string;
		action?: string;
		element?: any;
	}

	interface ErrorPayload {
		bindStack?: string;
		bindTime?: string;
		console?: ConsoleEvent[];
		customer?: CustomerInformation;
		entry?: string;
		environment?: EnvironmentInformation;
		message?: string;
		network?: NetworkEvent[];
		url?: string;
		stack?: string;
		timestamp?: string;
		visitor?: UserAction[];
		version?: string;
		throttled?: number;
	}

	interface Configuration {
		userId?: string;
		sessionId?: string;
		version?: string;
		onError?: (payload: ErrorPayload) => boolean;
		serialize?: (item: any) => string;
	}

	export interface TrackJs {
		track(error: any): void;
		configure(configuration: Configuration): void;
	}
}

declare var trackJs: TrackJs.TrackJs;