import stripeCheckout from 'stripe-checkout';
import { Token as StripeToken, Handler as StripeHandler } from 'stripe-checkout';
export { StripeToken }

export class StripeCheckout {
	private key: string = 'pk_live_dE91sDhX91BjTLPtreCzITEh';
	private companyName: string = 'Zoltu';
	private stripeHandler: StripeHandler = stripeCheckout.configure({
		key: this.key,
		name: this.companyName,
		zipCode: false
	});

	popup(email: string, productDescription: string, priceInCents: number, confirmButtonText: string): Promise<StripeToken> {
		return new Promise<StripeToken>((resolve: (value?: StripeToken | PromiseLike<StripeToken>) => void, reject: (reason?: Error) => void) => {
			this.stripeHandler.open({
				description: productDescription,
				amount: priceInCents,
				panelLabel: confirmButtonText,
				token: (token: StripeToken) => resolve(token),
				closed: () => reject(new Error('Checkout dialog closed.'))
			});
		});
	}
}
