export class RepositoryKey {
	constructor(
		public provider: string,
		public id: string
	) {}

	public toString(): string {
		return this.provider + ":" + this.id;
	}

	public equals(other: RepositoryKey): boolean {
		return this.provider === other.provider
			&& this.id === other.id;
	}
}

export class Repository {
	constructor(
		public key: RepositoryKey,
		public gitHubMetadata: RepositoryGitHubMetadata = null,
		public repoCreatorMetadata: RepositoryRepoCreatorMetadata = null
	) {}

	public mergeIn(other: Repository): Repository {
		if (!this.key.equals(other.key))
			throw new Error("Attempted to merge a repository with a mismatched key.");

		if (other.gitHubMetadata)
			this.gitHubMetadata = other.gitHubMetadata;

		if (other.repoCreatorMetadata)
			this.repoCreatorMetadata = other.repoCreatorMetadata;

		return this;
	}

	public equals(other: Repository): boolean {
		return this.key.equals(other.key);
	}

	public static deserializeFromGitHub(input: any): Repository {
		return new Repository(
			new RepositoryKey("GitHub", input.id.toString()),
			RepositoryGitHubMetadata.deserialize(input),
			null
		);
	}

	public static deserializeFromRepoCreator(input: any): Repository {
		return new Repository(
			new RepositoryKey(input.provider, input.id),
			null,
			RepositoryRepoCreatorMetadata.deserialize(input)
		);
	}
}

export class RepositoryGitHubMetadata {
	constructor(
		public owner: string,
		public name: string,
		public description: string,
		public language: string,
		public ownerType: string,
		public ownerAvatarUrl: string
	) {}

	public static deserialize(input: any): RepositoryGitHubMetadata {
		return new RepositoryGitHubMetadata(
			input.owner.login,
			input.name,
			input.description,
			input.language,
			input.owner.type,
			input.owner.avatar_url
		);
	}
}

export class RepositoryRepoCreatorMetadata {
	constructor(
		public sponsored: boolean = false,
		public favorite: boolean = false,
		public mySponsored: boolean = false,
		public favoriteCount: number = 0,
		public expirationDate: string = null
	) {}

	public static deserialize(input: any): RepositoryRepoCreatorMetadata {
		return new RepositoryRepoCreatorMetadata(
			input.sponsored,
			input.favorite,
			input.my_sponsored,
			input.favorite_count,
			input.expiration_date
		);
	}
}
