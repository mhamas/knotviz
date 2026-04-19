import { getCollection } from 'astro:content'
import type { APIRoute, GetStaticPaths } from 'astro'

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('docs')
  return entries.map((entry) => ({
    params: { slug: entry.id },
    props: { body: entry.body ?? '' },
  }))
}

export const GET: APIRoute = ({ props }) => {
  const body = (props as { body: string }).body
  return new Response(body, {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  })
}
