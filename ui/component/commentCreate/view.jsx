// @flow
import type { ElementRef } from 'react';
import { SIMPLE_SITE } from 'config';
import * as PAGES from 'constants/pages';
import * as ICONS from 'constants/icons';
import React, { useEffect, useState } from 'react';
import classnames from 'classnames';
import { FormField, Form } from 'component/common/form';
import Button from 'component/button';
import SelectChannel from 'component/selectChannel';
import usePersistedState from 'effects/use-persisted-state';
import { FF_MAX_CHARS_IN_COMMENT } from 'constants/form-field';
import { useHistory } from 'react-router';
import WalletTipAmountSelector from 'component/walletTipAmountSelector';
import LbcSymbol from 'component/common/lbc-symbol';
import CreditAmount from 'component/common/credit-amount';

const COMMENT_SLOW_MODE_SECONDS = 5;

type Props = {
  uri: string,
  claim: StreamClaim,
  createComment: (string, string, string, ?string) => Promise<any>,
  channels: ?Array<ChannelClaim>,
  onDoneReplying?: () => void,
  onCancelReplying?: () => void,
  isNested: boolean,
  isFetchingChannels: boolean,
  parentId: string,
  isReply: boolean,
  isPostingComment: boolean,
  activeChannel: string,
  activeChannelClaim: ?ChannelClaim,
  livestream?: boolean,
  toast: (string) => void,
  claimIsMine: boolean,
};

export function CommentCreate(props: Props) {
  const {
    createComment,
    claim,
    channels,
    onDoneReplying,
    onCancelReplying,
    isNested,
    isFetchingChannels,
    isReply,
    parentId,
    isPostingComment,
    activeChannelClaim,
    livestream,
    toast,
    claimIsMine,
    sendTip,
  } = props;
  const buttonref: ElementRef<any> = React.useRef();
  const {
    push,
    location: { pathname },
  } = useHistory();
  const { claim_id: claimId } = claim;
  const [isSupportComment, setIsSupportComment] = React.useState();
  const [isReviewingSupportComment, setIsReviewingSupportComment] = React.useState();
  const [tipAmount, setTipAmount] = React.useState(1);
  const [commentValue, setCommentValue] = React.useState('');
  const [lastCommentTime, setLastCommentTime] = React.useState();
  const [advancedEditor, setAdvancedEditor] = usePersistedState('comment-editor-mode', false);
  const hasChannels = channels && channels.length;
  const disabled = isPostingComment || !activeChannelClaim || !commentValue.length;
  const claimChannel = claim.signing_channel ? claim.signing_channel.name : __('Anonymous');
  const charCount = commentValue.length;

  function handleCommentChange(event) {
    let commentValue;
    if (isReply) {
      commentValue = event.target.value;
    } else {
      commentValue = !SIMPLE_SITE && advancedEditor ? event : event.target.value;
    }

    setCommentValue(commentValue);
  }

  function altEnterListener(e: SyntheticKeyboardEvent<*>) {
    const KEYCODE_ENTER = 13;
    if ((e.ctrlKey || e.metaKey) && e.keyCode === KEYCODE_ENTER) {
      e.preventDefault();
      buttonref.current.click();
    }
  }

  function onTextareaFocus() {
    window.addEventListener('keydown', altEnterListener);
  }

  function onTextareaBlur() {
    window.removeEventListener('keydown', altEnterListener);
  }

  function handleSubmit() {
    if (activeChannelClaim && commentValue.length) {
      const timeUntilCanComment = !lastCommentTime
        ? 0
        : (lastCommentTime - Date.now()) / 1000 + COMMENT_SLOW_MODE_SECONDS;

      if (livestream && !claimIsMine && timeUntilCanComment > 0) {
        toast(__('Slowmode is on. You can comment again in %time% seconds.', { time: Math.ceil(timeUntilCanComment) }));
        return;
      }

      handleCreateComment();
    }
  }

  function handleSupportComment() {
    const params = {
      amount: tipAmount,
      claim_id: claimId,
    };
    sendTip(params, (response) => {
      const { txid } = response;
      handleCreateComment(txid);
    });
  }

  function handleCreateComment(txid) {
    createComment(commentValue, claimId, parentId, txid).then((res) => {
      if (res && res.signature) {
        setCommentValue('');
        setLastCommentTime(Date.now());
        setIsReviewingSupportComment(false);
        setIsSupportComment(false);

        if (onDoneReplying) {
          onDoneReplying();
        }
      }
    });
  }

  function toggleEditorMode() {
    setAdvancedEditor(!advancedEditor);
  }

  if (!hasChannels) {
    return (
      <div
        role="button"
        onClick={() => {
          const pathPlusRedirect = `/$/${PAGES.CHANNEL_NEW}?redirect=${pathname}`;
          if (livestream) {
            window.open(pathPlusRedirect);
          } else {
            push(pathPlusRedirect);
          }
        }}
      >
        <FormField
          type="textarea"
          name={'comment_signup_prompt'}
          placeholder={__('Say something about this...')}
          label={isFetchingChannels ? __('Comment') : undefined}
        />
        <div className="section__actions">
          <Button disabled button="primary" label={__('Post --[button to submit something]--')} requiresAuth={IS_WEB} />
        </div>
      </div>
    );
  }

  if (isReviewingSupportComment) {
    return (
      <div className="comment__create">
        <div className="comment--superchat-preview">
          <div>{activeChannelClaim.name}</div>
          <div>{commentValue}</div>

          <CreditAmount amount={tipAmount} size={12} />
        </div>
        <div className="section__actions">
          <Button autoFocus button="primary" label={__('Confirm')} onClick={handleSupportComment} />
          <Button button="link" label={__('Cancel')} onClick={() => setIsReviewingSupportComment(false)} />
        </div>
      </div>
    );
  }

  return (
    <Form
      onSubmit={handleSubmit}
      className={classnames('comment__create', {
        'comment__create--reply': isReply,
        'comment__create--nested-reply': isNested,
      })}
    >
      <FormField
        disabled={!activeChannelClaim}
        type={SIMPLE_SITE ? 'textarea' : advancedEditor && !isReply ? 'markdown' : 'textarea'}
        name={isReply ? 'content_reply' : 'content_description'}
        label={
          <span className="comment-new__label-wrapper">
            {!livestream && (
              <div className="comment-new__label">{isReply ? __('Replying as') + ' ' : __('Comment as') + ' '}</div>
            )}
            <SelectChannel tiny />
          </span>
        }
        quickActionLabel={
          !SIMPLE_SITE && (isReply ? undefined : advancedEditor ? __('Simple Editor') : __('Advanced Editor'))
        }
        quickActionHandler={!SIMPLE_SITE && toggleEditorMode}
        onFocus={onTextareaFocus}
        onBlur={onTextareaBlur}
        placeholder={__('Say something about this...')}
        value={commentValue}
        charCount={charCount}
        onChange={handleCommentChange}
        autoFocus={isReply}
        textAreaMaxLength={FF_MAX_CHARS_IN_COMMENT}
      />
      {isSupportComment && <WalletTipAmountSelector amount={tipAmount} onChange={(amount) => setTipAmount(amount)} />}
      <div className="section__actions section__actions--no-margin">
        {isSupportComment ? (
          <>
            <Button
              disabled={disabled}
              type="button"
              button="primary"
              icon={ICONS.LBC}
              label={__('Send Moonchat')}
              onClick={() => setIsReviewingSupportComment(true)}
            />
            <Button disabled={disabled} button="link" label={__('Cancel')} onClick={() => setIsSupportComment(false)} />
          </>
        ) : (
          <>
            <Button
              ref={buttonref}
              button="primary"
              disabled={disabled}
              type="submit"
              label={
                isReply
                  ? isPostingComment
                    ? __('Replying...')
                    : __('Reply')
                  : isPostingComment
                  ? __('Commenting...')
                  : __('Comment --[button to submit something]--')
              }
              requiresAuth={IS_WEB}
            />
            <Button disabled={disabled} button="secondary" icon={ICONS.LBC} onClick={() => setIsSupportComment(true)} />
            {isReply && (
              <Button
                button="link"
                label={__('Cancel')}
                onClick={() => {
                  if (onCancelReplying) {
                    onCancelReplying();
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </Form>
  );
}
