import { promises } from 'node:fs';
import { join } from 'node:path';
import handlebars from 'handlebars';
import mjml2html from 'mjml';

type Props = {
  fileName: string;
  data: {
    date?: string;
    name?: string;
    url?: string;
    teamName?: string;
    link?: string;
    inviterName?: string;
  };
};

export default async function compileEmailTemplate({ fileName, data }: Props): Promise<string> {
  const templatePath =
    process.env.NODE_ENV === 'production'
      ? join(__dirname, '../../email-templates', fileName)
      : join('src/email-templates', fileName);

  const mjMail = await promises.readFile(templatePath, 'utf8');
  const result = await mjml2html(mjMail);
  const template = result.html;
  return handlebars.compile(template)(data).toString();
}
