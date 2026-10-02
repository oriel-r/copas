import path from 'node:path'
import type { NodePlopAPI } from 'plop'

const baseDir = path.resolve(process.env.INIT_CWD ?? process.cwd())
const resolveTarget = (p: string) => (path.isAbsolute(p) ? p : path.join(baseDir, p))

export default async function (plop: NodePlopAPI) {
  plop.setGenerator('app', {
    description: 'Create a new app in the monorepo',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'App name? (e.g., "web" or "admin")',
      },
    ],
    actions: (answers) => {
      const today = new Date().toISOString().slice(0, 10)
      const basePath = 'src/apps/{{name}}'
      return [
        {
          type: 'add',
          path: `${basePath}/package.json`,
          templateFile: 'generator/app/template/package.json.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/index.md`,
          templateFile: 'generator/app/template/index.md.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/log.md`,
          templateFile: 'generator/app/template/log.md.hbs',
          data: { date: today },
        },
        {
          type: 'add',
          path: `${basePath}/AGENTS.md`,
          templateFile: 'generator/app/template/AGENTS.md.hbs',
        },
      ]
    },
  })

  plop.setGenerator('package', {
    description: 'Create a new package in the monorepo',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Package name? (e.g., "ui" or "utils")',
      },
    ],
    actions: (answers) => {
      const today = new Date().toISOString().slice(0, 10)
      const basePath = 'src/packages/{{name}}'
      return [
        {
          type: 'add',
          path: `${basePath}/package.json`,
          templateFile: 'generator/package/template/package.json.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/src/index.ts`,
          templateFile: 'generator/package/template/src/index.ts.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/index.md`,
          templateFile: 'generator/package/template/index.md.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/log.md`,
          templateFile: 'generator/package/template/log.md.hbs',
          data: { date: today },
        },
        {
          type: 'add',
          path: `${basePath}/AGENTS.md`,
          templateFile: 'generator/package/template/AGENTS.md.hbs',
        },
      ]
    },
  })

  plop.setGenerator('doc', {
    description: 'Create a new documentation markdown file',
    prompts: [
      {
        type: 'input',
        name: 'title',
        message: 'Document path/name? (e.g., "my_doc" or "docs/api/my_doc")',
      },
      {
        type: 'list',
        name: 'type',
        message: 'Type?',
        choices: ['concept', 'convention', 'decision', 'roadmap', 'media-script', 'meta', 'raw_data', 'rules', 'guide'],
      },
      {
        type: 'input',
        name: 'producer',
        message: 'Producer? (e.g., "Jane Doe" or "agent/deepseek-v4-flash-free")',
        default: 'oriel',
      },
      {
        type: 'list',
        name: 'status',
        message: 'Status?',
        choices: ['draft', 'active'],
        default: 'draft',
      },
      {
        type: 'input',
        name: 'expires',
        message: 'Expires? (ISO timestamp, optional)',
      },
    ],
    actions: (answers) => {
      const created = new Date().toISOString()
      const segments = answers.title.split('/')
      const rawHeading = segments[segments.length - 1]
      const heading = rawHeading
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return [
        {
          type: 'add',
          path: resolveTarget(`${answers.title}.md`),
          templateFile: 'generator/doc/template.hbs',
          data: { created, heading },
        },
      ]
    },
  })
}
