import {
	getConsentFor as getConsentFor_,
	onConsentChange as onConsentChange_,
} from '@guardian/consent-management-platform';
import type { Callback } from '@guardian/consent-management-platform/dist/types';
import type { TCFv2ConsentState } from '@guardian/consent-management-platform/dist/types/tcfv2';
import config from '../../../../lib/config';
import { isGoogleProxy } from '../../../../lib/detect';
import { commercialFeatures } from '../../../common/modules/commercial/commercial-features';
import { prebid } from '../header-bidding/prebid/prebid';
import { dfpEnv } from './dfp-env';
import { _ } from './prepare-prebid';

const { setupPrebid } = _;
const onConsentChange = onConsentChange_ as jest.MockedFunction<
	typeof onConsentChange_
>;
const getConsentFor = getConsentFor_ as jest.MockedFunction<
	typeof getConsentFor_
>;

jest.mock('../../../common/modules/commercial/commercial-features', () => ({
	commercialFeatures: {},
}));

jest.mock('../header-bidding/prebid/prebid', () => ({
	prebid: {
		initialise: jest.fn(),
	},
}));

jest.mock('./Advert', () =>
	jest.fn().mockImplementation(() => ({ advert: jest.fn() })),
);

jest.mock('../../../common/modules/commercial/build-page-targeting', () => ({
	getPageTargeting: jest.fn(),
}));

jest.mock('../header-bidding/prebid/bid-config', () => ({
	isInVariant: jest.fn(),
}));

jest.mock('../header-bidding/utils', () => ({
	shouldIncludeOnlyA9: false,
}));

jest.mock('@guardian/consent-management-platform', () => ({
	onConsentChange: jest.fn(),
	getConsentFor: jest.fn(),
}));

const defaultTCFv2State: TCFv2ConsentState = {
	consents: { 1: false },
	eventStatus: 'tcloaded',
	vendorConsents: { abc: false },
	addtlConsent: 'xyz',
	gdprApplies: true,
	tcString: 'YAAA',
};
const tcfv2WithConsentMock = (callback: Callback) =>
	callback({
		tcfv2: {
			...defaultTCFv2State,
			vendorConsents: { '5f22bfd82a6b6c1afd1181a9': true },
		},
	});

const tcfv2WithoutConsentMock = (callback: Callback) =>
	callback({
		tcfv2: {
			...defaultTCFv2State,
			vendorConsents: { '5f22bfd82a6b6c1afd1181a9': false },
		},
	});

const ccpaWithConsentMock = (callback: Callback) =>
	callback({ ccpa: { doNotSell: false } });

const ccpaWithoutConsentMock = (callback: Callback) =>
	callback({ ccpa: { doNotSell: true } });

const ausWithConsentMock = (callback: Callback) =>
	callback({ aus: { personalisedAdvertising: true } });

const ausWithoutConsentMock = (callback: Callback) =>
	callback({ aus: { personalisedAdvertising: false } });

const fakeUserAgent = (userAgent: string) => {
	const userAgentObject = {
		get: () => userAgent,
		configurable: true,
	};
	Object.defineProperty(navigator, 'userAgent', userAgentObject);
};

describe('init', () => {
	const originalUA = navigator.userAgent;

	beforeEach(() => {
		jest.clearAllMocks();
		fakeUserAgent(originalUA);
	});

	afterAll(() => {
		jest.clearAllMocks();
	});

	it('should initialise Prebid when Prebid switch is ON and advertising is on and ad-free is off', async () => {
		expect.hasAssertions();

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		onConsentChange.mockImplementation(tcfv2WithConsentMock);
		getConsentFor.mockReturnValue(true);
		await setupPrebid();
		expect(prebid.initialise).toBeCalled();
	});

	it('should not initialise Prebid when useragent is Google Web Preview', async () => {
		expect.hasAssertions();

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		fakeUserAgent('Google Web Preview');
		await setupPrebid();
		expect(prebid.initialise).not.toBeCalled();
	});

	it('should not initialise Prebid when no header bidding switches are on', async () => {
		expect.hasAssertions();

		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		dfpEnv.hbImpl = { prebid: false, a9: false };
		await setupPrebid();
		expect(prebid.initialise).not.toBeCalled();
	});

	it('should not initialise Prebid when advertising is switched off', async () => {
		expect.hasAssertions();

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = false;
		commercialFeatures.adFree = false;
		await setupPrebid();
		expect(prebid.initialise).not.toBeCalled();
	});

	it('should not initialise Prebid when ad-free is on', async () => {
		expect.hasAssertions();

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = true;
		await setupPrebid();
		expect(prebid.initialise).not.toBeCalled();
	});

	it('should not initialise Prebid when the page has a pageskin', async () => {
		expect.hasAssertions();

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		config.set('page.hasPageSkin', true);
		await setupPrebid();
		expect(prebid.initialise).not.toBeCalled();
	});

	it('should initialise Prebid when the page has no pageskin', async () => {
		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		config.set('page.hasPageSkin', false);
		await setupPrebid();
		expect(prebid.initialise).toBeCalled();
	});
	it('should initialise Prebid if TCFv2 consent with correct Sourcepoint Id is true ', async () => {
		expect.hasAssertions();

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		onConsentChange.mockImplementation(tcfv2WithConsentMock);
		getConsentFor.mockReturnValue(true);
		await setupPrebid();
		expect(prebid.initialise).toBeCalled();
	});

	it('should not initialise Prebid if TCFv2 consent with correct Sourcepoint Id is false', async () => {
		expect.assertions(2);

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		onConsentChange.mockImplementation(tcfv2WithoutConsentMock);
		getConsentFor.mockReturnValue(false);

		await expect(setupPrebid()).rejects.toEqual('no consent for prebid');

		expect(prebid.initialise).not.toBeCalled();
	});

	it('should initialise Prebid in CCPA if doNotSell is false', async () => {
		expect.hasAssertions();

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		onConsentChange.mockImplementation(ccpaWithConsentMock);
		getConsentFor.mockReturnValue(true); // TODO: Why do we need to mock this?
		await setupPrebid();
		expect(prebid.initialise).toBeCalled();
	});

	it('should not initialise Prebid in CCPA if doNotSell is true', async () => {
		expect.assertions(2);

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		onConsentChange.mockImplementation(ccpaWithoutConsentMock);
		getConsentFor.mockReturnValue(false);

		await expect(setupPrebid()).rejects.toEqual('no consent for prebid');

		expect(prebid.initialise).not.toBeCalled();
	});

	it('should initialise Prebid in AUS if Advertising is not rejected', async () => {
		expect.hasAssertions();

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		onConsentChange.mockImplementation(ausWithConsentMock);
		getConsentFor.mockReturnValue(true);
		await setupPrebid();
		expect(prebid.initialise).toBeCalled();
	});

	it('should not initialise Prebid in AUS if Advertising is rejected', async () => {
		expect.assertions(2);

		dfpEnv.hbImpl = { prebid: true, a9: false };
		commercialFeatures.dfpAdvertising = true;
		commercialFeatures.adFree = false;
		onConsentChange.mockImplementation(ausWithoutConsentMock);
		getConsentFor.mockReturnValue(false);

		await expect(setupPrebid()).rejects.toEqual('no consent for prebid');

		expect(prebid.initialise).not.toBeCalled();
	});

	it('isGoogleWebPreview should return false with no navigator or useragent', () => {
		expect(isGoogleProxy()).toBe(false);
	});

	it('isGoogleWebPreview should return false with no navigator or useragent', () => {
		fakeUserAgent('Firefox');
		expect(isGoogleProxy()).toBe(false);
	});

	it('isGoogleWebPreview should return true with Google Web Preview useragent', () => {
		fakeUserAgent('Google Web Preview');
		expect(isGoogleProxy()).toBe(true);
	});

	it('isGoogleWebPreview should return true with Google Web Preview useragent', () => {
		fakeUserAgent('googleweblight');
		expect(isGoogleProxy()).toBe(true);
	});
});