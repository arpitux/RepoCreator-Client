import { Repository } from 'source/models/Repository';

export class RepositoryViewModel {
	constructor(
		public repository: Repository
	) {}

	public get owner(): string {
		return this.repository.gitHubMetadata && this.repository.gitHubMetadata.owner || "unknown";
	}

	public get name(): string {
		return this.repository.gitHubMetadata && this.repository.gitHubMetadata.name || "unknown";
	}

	public get description(): string {
		return this.repository.gitHubMetadata && this.repository.gitHubMetadata.description || "";
	}

	public get language(): string {
		return this.repository.gitHubMetadata && this.repository.gitHubMetadata.language || "";
	}

	public get gitHubLink(): string {
		return `https://github.com/${this.owner}/${this.name}`;
	}

	public get icon(): string {
		switch (this.language) {
			case 'C#':
				return `images/templates-bg/csharp.png`;
			case 'Go':
				return `images/templates-bg/go.png`;
			case `Java`:
				return `images/templates-bg/java.png`;
			case 'JavaScript':
				return `images/templates-bg/javascript.png`;
			case `Kotlin`:
				return `images/templates-bg/kotlin.png`;
			case `Python`:
				return `images/templates-bg/python.png`;
			case `Ruby`:
				return `images/templates-bg/ruby.png`;
			case `Rust`:
				return `images/templates-bg/rust.png`;
			case 'TypeScript':
				return `images/templates-bg/typescript.png`;
			default:
				return `images/templates-bg/unknown.png`;
		}
	}

	public get isSponsored(): boolean {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.sponsored || false;
	}

	public get isFavorite(): boolean {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.favorite || false;
	}

	public get isPopular(): boolean {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.favoriteCount > 0 || false;
	}

	public get isMySponsored(): boolean {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.mySponsored || false;
	}

	public get favoriteCount(): number {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.favoriteCount || 0;
	}

	public equals = (other: RepositoryViewModel): boolean => {
		return this.repository.equals(other.repository);
	}

	public getCssFilters = (): string => {
		let selectors: string[] = [];
		if (this.isFavorite)
			selectors.push('favorite');
		if (this.isSponsored)
			selectors.push('sponsored');
		if (this.isMySponsored)
			selectors.push('my-sponsored');
		if (this.isPopular)
			selectors.push('popular');

		return selectors.join(' ');
	}
}
