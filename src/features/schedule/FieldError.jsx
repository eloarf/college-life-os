/** A red message under a form field. Renders nothing when there is no message. */
export default function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="field__error" role="alert">
      {message}
    </p>
  );
}
