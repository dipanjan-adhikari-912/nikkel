import { Pin } from '../domain/models/index.js';

export class PinMapper {
  fromDB(row) {
    return new Pin({
      id: row.id,
      reviewId: row.review_id,
      pageUrl: row.page_url,
      pageX: row.x,
      pageY: row.y,
      viewportW: row.viewport_w,
      viewportH: row.viewport_h,
      tag: row.tag,
      selector: row.dom_selector,
      elementText: row.element_text,
      comment: row.comment,
      idx: row.idx,
      userId: row.owner_id,
      createdAt: row.created_at,
    });
  }

  toDB(pin) {
    const obj = {
      review_id: pin.reviewId,
      page_url: pin.pageUrl,
      dom_selector: pin.selector,
      x: pin.pageX,
      y: pin.pageY,
      viewport_w: pin.viewportW,
      viewport_h: pin.viewportH,
      tag: pin.tag,
      element_text: pin.elementText,
      comment: pin.comment,
      idx: pin.idx,
    };
    if (pin.id != null) obj.id = pin.id;
    return obj;
  }
}
