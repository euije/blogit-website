'use client';

import React, { useEffect, useState } from 'react';
import 'react-quill/dist/quill.snow.css';

import { useCommitStore } from '@/store';
import { Headline_00 } from './Typography';
import { Button } from './Button';

import MDEditor from '@uiw/react-md-editor';
import { generateCompletion } from '@/app/api/openai';
import { readStreamableValue } from 'ai/rsc';

import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { useFormState } from 'react-dom';
import { createPost } from '@/app/actions/post';
import { getPost } from '@/app/api/platform/post';
import { redirect } from 'next/navigation';

export default function TextEditor({
  articleId,
  readOnly,
}: {
  articleId?: number;
  readOnly?: boolean;
}) {
  const commitStore = useCommitStore();

  const [message, formAction] = useFormState(createPost, undefined);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [text, setText] = useState<string>('');

  useEffect(() => {
    async function callGPT() {
      setIsLoading(true);

      const { output } = await generateCompletion(
        JSON.stringify(commitStore.commits),
      );
      for await (const delta of readStreamableValue(output)) {
        setText((prev) => `${prev}${delta}`);
      }

      setIsLoading(false);
    }
    async function fetchArticle() {
      setIsLoading(true);

      if (articleId) {
        const article = await getPost(articleId);
        setTitle(article.title);
        setText(article.content);
      }

      setIsLoading(false);
    }

    if (articleId === undefined) {
      callGPT();
    } else {
      fetchArticle();
    }
  }, []);

  useEffect(() => {
    if (message === false) {
      alert('오류가 발생하였습니다. 다시 시도해주세요.');
    } else if (message === true) {
      redirect('/post/share');
    }
  }, [message]);

  function handleDownload() {
    // Create a Blob object representing the file content
    const fileContent = text; // Replace with your actual file content
    const blob = new Blob([fileContent], { type: 'text/plain' });

    // Create a link element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.md`; // Set the file name

    // Programmatically click the link to trigger the download
    link.click();

    // Clean up the URL object
    URL.revokeObjectURL(link.href);
  }

  return (
    <>
      {isLoading && (
        <div className='flex items-center mb-4'>
          <div className='flex justify-center items-center mr-4'>
            <div className='border border-t-4 border-gray-200 rounded-full w-12 h-12 animate-spin'></div>
          </div>
          <Headline_00>GPT가 글을 작성중입니다...</Headline_00>
        </div>
      )}
      <form action={formAction}>
        <input
          type='text'
          name='title'
          placeholder='아티클의 제목을 입력해주세요'
          className='border rounded-lg p-2 w-[20rem] focus:outline-none mt-4'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          readOnly={readOnly}
        />
        <MDEditor
          textareaProps={{
            name: 'content',
            readOnly: readOnly,
          }}
          height={720}
          value={text}
          autoFocus={true}
          onChange={(v, e) => setText((prev) => (prev = v!))}
        />
        <div className='flex gap-4 p-10 '>
          <Button
            type='submit'
            size='L'
            backgroundColor='#74AA9C'
            className='h-10'
            disabled={isLoading || readOnly}
          >
            {'확인'}
          </Button>
          <Button
            size='L'
            backgroundColor='#95afa8'
            className='h-10'
            onClick={handleDownload}
            disabled={isLoading}
          >
            {'글 다운로드 하기'}
          </Button>
        </div>
      </form>
    </>
  );
}
