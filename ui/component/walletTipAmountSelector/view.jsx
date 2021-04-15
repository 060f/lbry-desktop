// @flow
import * as ICONS from 'constants/icons';
import * as PAGES from 'constants/pages';
import React from 'react';
import Button from 'component/button';
import { FormField, Form } from 'component/common/form';
import { MINIMUM_PUBLISH_BID } from 'constants/claim';
import CreditAmount from 'component/common/credit-amount';
import I18nMessage from 'component/i18nMessage';
import { Lbryio } from 'lbryinc';
import Card from 'component/common/card';
import classnames from 'classnames';
import ChannelSelector from 'component/channelSelector';
import LbcSymbol from 'component/common/lbc-symbol';
import { parseURI } from 'lbry-redux';
import usePersistedState from 'effects/use-persisted-state';
import WalletSpendableBalanceHelp from 'component/walletSpendableBalanceHelp';

const DEFAULT_TIP_AMOUNTS = [1, 5, 25, 100];

type SupportParams = { amount: number, claim_id: string, channel_id?: string };

type Props = {
  uri: string,
  claimIsMine: boolean,
  title: string,
  claim: StreamClaim,
  isPending: boolean,
  sendSupport: (SupportParams, boolean) => void,
  closeModal: () => void,
  balance: number,
  isSupport: boolean,
  fetchingChannels: boolean,
  instantTipEnabled: boolean,
  instantTipMax: { amount: number, currency: string },
  activeChannelClaim: ?ChannelClaim,
  incognito: boolean,
};

function WalletSendTip(props: Props) {
  const {
    uri,
    title,
    isPending,
    claimIsMine,
    balance,
    claim = {},
    instantTipEnabled,
    instantTipMax,
    sendSupport,
    closeModal,
    fetchingChannels,
    incognito,
    activeChannelClaim,
  } = props;
  const [presetTipAmount, setPresetTipAmount] = usePersistedState('comment-support:presetTip', DEFAULT_TIP_AMOUNTS[0]);
  const [customTipAmount, setCustomTipAmount] = usePersistedState('comment-support:customTip', 1.0);
  const [useCustomTip, setUseCustomTip] = usePersistedState('comment-support:useCustomTip', false);
  const [tipError, setTipError] = React.useState();
  const [sendAsTip, setSendAsTip] = usePersistedState('comment-support:sendAsTip', true);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const { claim_id: claimId } = claim;
  const { channelName } = parseURI(uri);
  const noBalance = balance === 0;
  const tipAmount = useCustomTip ? customTipAmount : presetTipAmount;
  const isSupport = claimIsMine || !sendAsTip;

  React.useEffect(() => {
    const regexp = RegExp(/^(\d*([.]\d{0,8})?)$/);
    const validTipInput = regexp.test(String(tipAmount));
    let tipError;

    if (!tipAmount) {
      tipError = __('Amount must be a number');
    } else if (tipAmount <= 0) {
      tipError = __('Amount must be a positive number');
    } else if (tipAmount < MINIMUM_PUBLISH_BID) {
      tipError = __('Amount must be higher');
    } else if (!validTipInput) {
      tipError = __('Amount must have no more than 8 decimal places');
    } else if (tipAmount === balance) {
      tipError = __('Please decrease the amount to account for transaction fees');
    } else if (tipAmount > balance) {
      tipError = __('Not enough Credits');
    }
    setTipError(tipError);
  }, [tipAmount, balance, setTipError]);

  function sendSupportOrConfirm(instantTipMaxAmount = null) {
    let selectedChannelId;
    if (!incognito && activeChannelClaim) {
      selectedChannelId = activeChannelClaim.claim_id;
    }

    if (
      !isSupport &&
      !isConfirming &&
      (!instantTipMaxAmount || !instantTipEnabled || tipAmount > instantTipMaxAmount)
    ) {
      setIsConfirming(true);
    } else {
      const supportParams: SupportParams = { amount: tipAmount, claim_id: claimId };
      if (selectedChannelId) {
        supportParams.channel_id = selectedChannelId;
      }
      sendSupport(supportParams, isSupport);
      closeModal();
    }
  }

  function handleSubmit() {
    if (tipAmount && claimId) {
      if (instantTipEnabled) {
        if (instantTipMax.currency === 'LBC') {
          sendSupportOrConfirm(instantTipMax.amount);
        } else {
          // Need to convert currency of instant purchase maximum before trying to send support
          Lbryio.getExchangeRates().then(({ LBC_USD }) => {
            sendSupportOrConfirm(instantTipMax.amount / LBC_USD);
          });
        }
      } else {
        sendSupportOrConfirm();
      }
    }
  }

  function handleCustomPriceChange(event: SyntheticInputEvent<*>) {
    const tipAmount = parseFloat(event.target.value);
    setCustomTipAmount(tipAmount);
  }

  return (
    <>
      <div className="section">
        {DEFAULT_TIP_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            disabled={amount > balance}
            button="alt"
            className={classnames('button-toggle button-toggle--expandformobile', {
              'button-toggle--active': tipAmount === amount,
              'button-toggle--disabled': amount > balance,
            })}
            label={amount}
            icon={ICONS.LBC}
            onClick={() => {
              setPresetTipAmount(amount);
              setUseCustomTip(false);
            }}
          />
        ))}
        <Button
          button="alt"
          className={classnames('button-toggle button-toggle--expandformobile', {
            'button-toggle--active': !DEFAULT_TIP_AMOUNTS.includes(tipAmount),
          })}
          icon={ICONS.LBC}
          label={__('Custom')}
          onClick={() => setUseCustomTip(true)}
        />
        {DEFAULT_TIP_AMOUNTS.some((val) => val > balance) && (
          <Button
            button="secondary"
            className="button-toggle-group-action"
            icon={ICONS.BUY}
            title={__('Buy more LBRY Credits')}
            navigate={`/$/${PAGES.BUY}`}
          />
        )}
      </div>

      {useCustomTip && (
        <div className="section">
          <FormField
            autoFocus
            name="tip-input"
            label={
              <React.Fragment>
                {__('Custom support amount')}{' '}
                <I18nMessage tokens={{ lbc_balance: <CreditAmount precision={4} amount={balance} showLBC={false} /> }}>
                  (%lbc_balance% Credits available)
                </I18nMessage>
              </React.Fragment>
            }
            className="form-field--price-amount"
            error={tipError}
            min="0"
            step="any"
            type="number"
            placeholder="1.23"
            value={customTipAmount}
            onChange={(event) => handleCustomPriceChange(event)}
          />
        </div>
      )}

      <WalletSpendableBalanceHelp />
    </>
  );
}

export default WalletSendTip;
