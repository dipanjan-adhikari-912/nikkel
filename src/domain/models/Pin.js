export class Pin {
  constructor({ id, reviewId, pageUrl, pageX, pageY, viewportW, viewportH, tag, selector, elementText, comment, idx, userId, createdAt }) {
    this.id = id;
    this.reviewId = reviewId;
    this.pageUrl = pageUrl || '';
    this.pageX = pageX || 0;
    this.pageY = pageY || 0;
    this.viewportW = viewportW || 0;
    this.viewportH = viewportH || 0;
    this.tag = tag || '';
    this.selector = selector || '';
    this.elementText = elementText || '';
    this.comment = comment || '';
    this.idx = idx || 0;
    this.userId = userId || null;
    this.createdAt = createdAt ? new Date(createdAt) : null;
  }

  get isRemote() {
    return !!this.userId;
  }

  get review_id() { return this.reviewId; }
  get page_url() { return this.pageUrl; }
  get page_x() { return this.pageX; }
  get page_y() { return this.pageY; }
  get viewport_w() { return this.viewportW; }
  get viewport_h() { return this.viewportH; }
  get dom_selector() { return this.selector; }
  get element_text() { return this.elementText; }
  get owner_id() { return this.userId; }
}
