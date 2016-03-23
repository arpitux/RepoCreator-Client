import { Profile, Identity } from 'auth0-lock';
import Auth0Lock from 'auth0-lock';
import underscore from 'underscore';

class User {
	constructor(
		public userId: string,
		public nickname: string,
		public email: string,
		public jwtToken: string,
		public photoUrl: string,
		public identities: Map<string, Identity>
	) {
		this.validate();
	}

	public get decodedJwtToken(): any {
		let encodedPayload = this.jwtToken.split(".")[1];
		let decodedPayload = atob(encodedPayload);
		let deserializedPayload = JSON.parse(decodedPayload);
		return deserializedPayload;
	}

	public static deserializeFromJson(json: string): User {
		let object = JSON.parse(json);
		return User.deserializeFromObject(object);
	}

	public static deserializeFromObject(object: any): User {
		let userId: string = object.userId;
		let nickname: string = object.nickname;
		let email: string = object.email;
		let jwtToken: string = object.jwtToken;
		let photoUrl: string = object.photoUrl;
		let identities: Map<string, Identity> = new Map<string, Identity>(object.identities);
		let user = new User(userId, nickname, email, jwtToken, photoUrl, identities);
		return user;
	}

	private validate() {
		if (typeof this.userId !== 'string')
			throw new Error(`Expected userId to be a string but it was a ${typeof this.userId}`);
		if (typeof this.nickname !== 'string')
			throw new Error(`Expected nickname to be a string but it was a ${typeof this.nickname}`)
		if (typeof this.email !== 'string')
			throw new Error(`Expected email to be a string but it was a ${typeof this.email}`)
		if (typeof this.jwtToken !== 'string')
			throw new Error(`Expected jwtToken to be a string but it was a ${typeof this.jwtToken}`)
		if (typeof this.photoUrl !== 'string')
			throw new Error(`Expected photoUrl to be a string but it was a ${typeof this.photoUrl}`)
		if (!(this.identities instanceof Map))
			throw new Error(`Expected identities to be a Map<Identities> but it was a ${typeof this.identities}`)
	}
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

	constructor() {
		try {
			let localStorageUser = sessionStorage.getItem('Auth0 User');
			if (localStorageUser) {
				let user = User.deserializeFromJson(localStorageUser);
				this._userPromise = Promise.resolve(user);
			}
		} catch (thing) {
			this.logout();
		}
	}

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

	get isLoggedOrLoggingIn(): boolean {
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

		return this._userPromise.then(user => user.identities.get('github')['access_token']);
	}

	get photoUrl(): Promise<string> {
		return this.userPromise.then(user => user.photoUrl);
	}

	get gitHubAuthToken(): Promise<string> {
		return this.userPromise.then(user => user.identities.get('github')['access_token']);
	}

	get gitHubLogin(): Promise<string> {
		return this.userPromise.then(user => user.nickname);
	}

	get gitHubEmail(): Promise<string> {
		return this.userPromise.then(user => user.email);
	}


	logout = (): void => {
		// calling this.auth0.logout() causes a redirect, so we'll just clear their session and reject the promise instead
		sessionStorage.clear();
		this._userPromise = null;
	}

	private login = (): Promise<User> => {
		return this.auth0.showSignin({ connections: ['github'], socialBigButtons: true, authParams: { scope: 'openid identities' } }).then(result => {
			let identities = underscore(result.profile.identities).reduce((result: Map<string, Identity>, identity: Identity) => {
				result.set(identity.provider, identity);
				return result;
			}, new Map<string, Identity>());
			let user = new User(result.profile.user_id, result.profile.nickname, result.profile.email, result.jwtToken, result.profile.picture, identities);
			sessionStorage.setItem('Auth0 User', JSON.stringify(user, OAuth.mapReplacer));
			return user;
		});
	}

	private static mapReplacer(key: any, value: any) {
		if (value instanceof Map)
			// this becomes much simpler in ES6:  return [...value]
			return [...Array.from(value)];
		else
			return value;
	}
}
