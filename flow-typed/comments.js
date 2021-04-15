// @flow
declare type CommentListParams = {
  page: number,
  page_size: number,
  claim_id: string,
};

declare type CommentAbandonParams = {
  comment_id: string,
  creator_channel_id?: string,
  creator_channel_name?: string,
  channel_id?: string,
  hexdata?: string,
};

declare type CommentCreateParams = {
  comment: string,
  claim_id: string,
  parent_id?: string,
  signature: string,
  signing_ts: number,
  support_tx_id?: string,
};

declare type ModerationBlockParams = {};
