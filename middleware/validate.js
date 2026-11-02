// validate(schema) — проверяет req.body через zod; ошибка уходит в errorHandler (400).
export function validate(schema) {
  return (req, res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}
