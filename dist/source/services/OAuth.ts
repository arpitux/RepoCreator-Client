import { Profile, Identity } from 'auth0-lock';
import Auth0Lock from 'auth0-lock';
import underscore from 'underscore';

class Map<T> {
	[key: string]: T
}

class User {
	constructor(
		public userId: string,
		public nickname: string,
		public email: string,
		public jwtToken: string,
		public identities: Map<Identity>
	) {}
}

interface SigninResult {
	profile: Profile;
	jwtToken: string;
}

class Auth0LockWrapper {
	private auth0Lock: Auth0Lock = new Auth0Lock('GbwGInNlOq75YqX1Xv9BKxRTA1V3cCkC', 'zoltu.auth0.com');

	showSignin(options: any): Promise<SigninResult> {
		return new Promise<SigninResult>((resolve, reject) => {
			let error: Error = null;
			let signinResult: SigninResult = null;
			// auth0 will not call the showSignin callback if the popup is closed, so we have to store the result of the callback and wait for the hidden event to be fired
			this.auth0Lock.on('hidden', () => {
				if (signinResult)
					resolve(signinResult);
				else
					reject(error || new Error("Popup closed"));
			});
			this.auth0Lock.showSignin(options, (_error: Error, profile: Profile, idToken: string) => {
				if (_error)
					error = _error;
				else
					signinResult = {
						profile: profile,
						jwtToken: idToken
					};
			});
		});
	}

	logout(): void {
		this.auth0Lock.logout();
	}
}

export class OAuth {
	private auth0: Auth0LockWrapper = new Auth0LockWrapper();
	private _userPromise: Promise<User> = null;

	private get userPromise(): Promise<User> {
		// if already logged in, return that promise
		if (this._userPromise)
			return this._userPromise;

		// attempt to login and save the attempt promise so other attempts to login while waiting will share in the results
		this._userPromise = this.login();

		// if login fails, assign back to null so that future attempts will re-attempt to login
		// this is intentionally not chained because we don't want to swallow errors for other listeners
		this._userPromise.catch(error => this._userPromise = null);

		// return the promise that is currently attempting a login (note: this promise has no catch handler)
		return this._userPromise;
	}

	get isLoggedIn(): boolean {
		return !!this._userPromise;
	}

	get maybeJwtToken(): Promise<string> {
		if (!this._userPromise)
			return Promise.resolve<string>(null);

		return this._userPromise.then(user => user.jwtToken);
	}

	get jwtToken(): Promise<string> {
		return this.userPromise.then(user => user.jwtToken);
	}

	get maybeGitHubAuthToken(): Promise<string> {
		if (!this._userPromise)
			return Promise.resolve<string>(null);

		return this._userPromise.then(user => user.identities['github']['access_token']);
	}

	get gitHubAuthToken(): Promise<string> {
		return this.userPromise.then(user => user.identities['github']['access_token']);
	}

	get gitHubLogin(): Promise<string> {
		return this.userPromise.then(user => user.nickname);
	}

	get gitHubEmail(): Promise<string> {
		return this.userPromise.then(user => user.email);
	}

	logout = (): void => {
		this.auth0.logout();
		this.userPromise = Promise.reject<User>(new Error('Not logged in.'));
	}

	private login = (): Promise<User> => {
		return this.auth0.showSignin({ connections: ['github'], socialBigButtons: true, authParams: { scope: 'openid identities' } }).then(result => {
			let identities = underscore(result.profile.identities).reduce((result: Map<Identity>, identity: Identity) => {
				result[identity.provider] = identity;
				return result;
			}, new Map<Identity>());
			return new User(result.profile.user_id, result.profile.nickname, result.profile.email, result.jwtToken, identities);
		});
	}
}
