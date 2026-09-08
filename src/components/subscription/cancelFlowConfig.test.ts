import { getCancelReasons } from './cancelFlowConfig';

// The cancel survey has to know whether it is talking to somebody inside a trial,
// and the plan CODE cannot answer that across both rails:
//
//   Razorpay  trial -> planCode TRIAL / TRIAL_NEW, status TRIAL
//   Apple     trial -> planCode ANNUAL_POST_TRIAL, status TRIAL
//
// So an Apple trial reads as a plain annual subscriber by code alone, and was
// being handed the paid list — losing the one reason that explains most trial
// churn.
const codesOf = (options: { code: string }[]) => options.map(o => o.code);

describe('getCancelReasons', () => {
  it('gives an Apple trial the trial list, despite its yearly plan code', () => {
    const reasons = getCancelReasons('ANNUAL_POST_TRIAL', true);

    expect(codesOf(reasons)).toContain('UNAWARE_OF_CHARGE');
    expect(codesOf(reasons)).toContain('JUST_TRYING');
  });

  // Apple cannot charge the ₹1 the Razorpay mandate takes — an introductory
  // offer is free or a price tier — so quoting the fee would make the option
  // unpickable for exactly the people it exists to catch.
  it('never quotes the ₹1 fee to a rail that cannot charge it', () => {
    const apple = getCancelReasons('ANNUAL_POST_TRIAL', true);
    const razorpay = getCancelReasons('TRIAL_NEW', true);

    const label = (options: { code: string; label: string }[]) =>
      options.find(o => o.code === 'JUST_TRYING')?.label ?? '';

    expect(label(apple)).not.toContain('₹1');
    expect(label(razorpay)).toContain('₹1');
  });

  // Unchanged Razorpay behaviour: a CONVERTED trial keeps its trial code with
  // status ACTIVE, and "I didn't realise I'd be charged" is precisely what that
  // person is cancelling over.
  it('keeps the trial list for a converted Razorpay trial', () => {
    expect(codesOf(getCancelReasons('TRIAL_NEW', false))).toContain(
      'UNAWARE_OF_CHARGE',
    );
  });

  it('gives a genuine paid subscriber the usage list', () => {
    const reasons = codesOf(getCancelReasons('ANNUAL', false));

    expect(reasons).toContain('NOT_WATCHING');
    expect(reasons).not.toContain('UNAWARE_OF_CHARGE');
  });

  // Every reason code the survey can send must be one the backend accepts, on
  // either rail — the labels differ, the codes may not.
  it('sends the same reason codes whichever rail is in the trial', () => {
    expect(codesOf(getCancelReasons('ANNUAL_POST_TRIAL', true))).toEqual(
      codesOf(getCancelReasons('TRIAL_NEW', true)),
    );
  });
});
