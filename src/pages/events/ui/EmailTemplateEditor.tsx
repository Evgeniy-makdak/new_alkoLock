import React from 'react';

import { Editor } from '@tinymce/tinymce-react';

interface EmailTemplateEditorProps {
  initialContent?: string;
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ initialContent = '' }) => {
  const [content, setContent] = React.useState<string>(initialContent);

  const handleEditorChange = (newContent: string) => {
    setContent(newContent);
  };

  return (
    <div>
      <Editor
        apiKey="bgz75tshd3764oezi1hqxeyqeugcwoqbwntl8vzrcuhk7d7x"
        value={content}
        init={{
          height: 400,
          menubar: false,
          plugins: [
            'advlist autolink lists link image charmap print preview anchor',
            'searchreplace visualblocks code fullscreen',
            'insertdatetime media table paste code help wordcount',
          ],
          toolbar:
            'undo redo | formatselect | bold italic backcolor | \
            alignleft aligncenter alignright alignjustify | \
            bullist numlist outdent indent | removeformat | help',
        }}
        onEditorChange={handleEditorChange}
      />
    </div>
  );
};

export default EmailTemplateEditor;
