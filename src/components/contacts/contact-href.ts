/** Ссылка на карточку человека в разделе «Контакты»: панель открывается сразу. */
export function contactPersonHref(id: string) {
  return `/contacts?contact=${encodeURIComponent(id)}`;
}
