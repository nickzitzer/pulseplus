import React from "react";
import { Field } from "formik";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import dynamic from "next/dynamic";

interface MarkdownFieldProps {
  name: string;
  label: string;
  className?: string;
}

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

const EditerMarkdown = dynamic(
  () =>
    import("@uiw/react-md-editor").then((mod) => {
      return mod.default.Markdown;
    }),
  { ssr: false }
);

const MarkdownField: React.FC<MarkdownFieldProps> = ({
  name,
  label,
  className,
}) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <div className={`${className}`}>
          <label>{label}</label>
          <MDEditor
            value={field.value}
            onChange={(value) => form.setFieldValue(name, value)}
            preview="edit"
          />
          <div style={{ paddingTop: 50 }}>
            <EditerMarkdown source={field.value} />
          </div>
        </div>
      )}
    </Field>
  );
};

export default MarkdownField;
