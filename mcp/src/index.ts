#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { PreRollClient } from './client.js'

const client = PreRollClient.fromEnv()

const server = new McpServer(
  { name: 'preroll', version: '0.1.0' },
  { instructions: 'PreRoll is a podcast production management platform. Use get_dashboard first for situational awareness before performing operations.' }
)

function text(data: unknown): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

// Dashboard
server.tool('get_dashboard', 'Get dashboard overview: in-progress episodes, upcoming deadlines, recent activity, and stats', {}, async () => {
  return text(await client.get('/dashboard'))
})

// Clients
server.tool('list_clients', 'List all clients', {}, async () => {
  return text(await client.get('/clients'))
})

server.tool('get_client', 'Get a client by ID', { client_id: z.string().describe('Client UUID') }, async ({ client_id }) => {
  return text(await client.get(`/clients/${client_id}`))
})

server.tool('create_client', 'Create a new client', {
  name: z.string().describe('Client name'),
  company: z.string().optional().describe('Company name'),
  email: z.string().optional().describe('Contact email'),
  phone: z.string().optional().describe('Phone number'),
  notes: z.string().optional().describe('Notes about the client'),
}, async (args) => {
  return text(await client.post('/clients', args))
})

server.tool('update_client', 'Update a client', {
  client_id: z.string().describe('Client UUID'),
  name: z.string().optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
}, async ({ client_id, ...updates }) => {
  return text(await client.patch(`/clients/${client_id}`, updates))
})

// Shows
server.tool('list_shows', 'List shows, optionally filtered by client', {
  client_id: z.string().optional().describe('Filter by client UUID'),
}, async ({ client_id }) => {
  const query = client_id ? `?client_id=${client_id}` : ''
  return text(await client.get(`/shows${query}`))
})

server.tool('get_show', 'Get a show by ID with pipeline stages', { show_id: z.string().describe('Show UUID') }, async ({ show_id }) => {
  return text(await client.get(`/shows/${show_id}`))
})

server.tool('create_show', 'Create a new show (auto-creates default pipeline stages)', {
  client_id: z.string().describe('Client UUID'),
  name: z.string().describe('Show name'),
  description: z.string().optional(),
  format: z.enum(['interview', 'solo', 'panel', 'narrative', 'other']).optional(),
  schedule: z.string().optional().describe('e.g. "Weekly on Tuesdays"'),
}, async (args) => {
  return text(await client.post('/shows', args))
})

server.tool('update_show', 'Update a show', {
  show_id: z.string().describe('Show UUID'),
  name: z.string().optional(),
  description: z.string().optional(),
  format: z.string().optional(),
  schedule: z.string().optional(),
}, async ({ show_id, ...updates }) => {
  return text(await client.patch(`/shows/${show_id}`, updates))
})

// Episodes
server.tool('list_episodes', 'List episodes across all shows with optional filters', {
  show_id: z.string().optional().describe('Filter by show UUID'),
  status: z.string().optional().describe('Filter by status: planning, recording, editing, review, approved, published'),
  from: z.string().optional().describe('Start date (YYYY-MM-DD) for scheduled_publish_date range'),
  to: z.string().optional().describe('End date (YYYY-MM-DD) for scheduled_publish_date range'),
}, async (args) => {
  const params = new URLSearchParams()
  if (args.show_id) params.set('show_id', args.show_id)
  if (args.status) params.set('status', args.status)
  if (args.from) params.set('from', args.from)
  if (args.to) params.set('to', args.to)
  const query = params.toString() ? `?${params}` : ''
  return text(await client.get(`/episodes${query}`))
})

server.tool('get_episode', 'Get an episode by ID', {
  show_id: z.string().describe('Show UUID'),
  episode_id: z.string().describe('Episode UUID'),
}, async ({ show_id, episode_id }) => {
  return text(await client.get(`/shows/${show_id}/episodes/${episode_id}`))
})

server.tool('create_episode', 'Create a new episode for a show (applies show template if set)', {
  show_id: z.string().describe('Show UUID'),
  title: z.string().describe('Episode title'),
  episode_number: z.number().optional(),
  description: z.string().optional(),
  notes: z.string().optional().describe('Internal notes / show notes'),
  scheduled_publish_date: z.string().optional().describe('YYYY-MM-DD'),
}, async ({ show_id, ...body }) => {
  return text(await client.post(`/shows/${show_id}/episodes`, body))
})

server.tool('update_episode', 'Update an episode (changing stage_id triggers pipeline movement)', {
  show_id: z.string().describe('Show UUID'),
  episode_id: z.string().describe('Episode UUID'),
  title: z.string().optional(),
  episode_number: z.number().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  stage_id: z.string().optional().describe('Pipeline stage UUID — moves episode to this stage'),
  scheduled_publish_date: z.string().optional().describe('YYYY-MM-DD'),
}, async ({ show_id, episode_id, ...updates }) => {
  return text(await client.patch(`/shows/${show_id}/episodes/${episode_id}`, updates))
})

// Deliverables
server.tool('list_deliverables', 'List deliverables with optional filters', {
  show_id: z.string().optional(),
  episode_id: z.string().optional(),
  status: z.string().optional().describe('pending, approved, or revision_requested'),
}, async (args) => {
  const params = new URLSearchParams()
  if (args.show_id) params.set('show_id', args.show_id)
  if (args.episode_id) params.set('episode_id', args.episode_id)
  if (args.status) params.set('status', args.status)
  const query = params.toString() ? `?${params}` : ''
  return text(await client.get(`/deliverables${query}`))
})

server.tool('create_deliverable', 'Create a deliverable for review', {
  show_id: z.string().describe('Show UUID'),
  title: z.string().describe('Deliverable title'),
  episode_id: z.string().optional(),
  type: z.enum(['rough_cut', 'final_cut', 'thumbnail', 'show_notes', 'cover_art', 'intro', 'outro', 'social_clip', 'other']).optional(),
  description: z.string().optional(),
  file_url: z.string().optional(),
}, async (args) => {
  return text(await client.post('/deliverables', args))
})

server.tool('update_deliverable', 'Update a deliverable (approve, request revision, or edit)', {
  deliverable_id: z.string().describe('Deliverable UUID'),
  status: z.enum(['approved', 'revision_requested', 'pending']).optional(),
  reviewer_notes: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
}, async ({ deliverable_id, ...updates }) => {
  return text(await client.patch(`/deliverables/${deliverable_id}`, updates))
})

// Activity
server.tool('get_activity', 'Get recent activity for a show', {
  show_id: z.string().describe('Show UUID'),
  limit: z.number().optional().describe('Max entries (default 50)'),
}, async ({ show_id, limit }) => {
  const query = limit ? `?show_id=${show_id}&limit=${limit}` : `?show_id=${show_id}`
  return text(await client.get(`/activity${query}`))
})

// Tags
server.tool('list_tags', 'List all tags', {}, async () => {
  return text(await client.get('/tags'))
})

server.tool('create_tag', 'Create a tag', {
  name: z.string().describe('Tag name'),
  color: z.string().optional().describe('Hex color, e.g. #6366f1'),
}, async (args) => {
  return text(await client.post('/tags', args))
})

// Pipeline stages
server.tool('list_stages', 'List pipeline stages for a show', { show_id: z.string() }, async ({ show_id }) => {
  return text(await client.get(`/shows/${show_id}/stages`))
})

// Meeting notes
server.tool('list_notes', 'List meeting notes for a client', { client_id: z.string() }, async ({ client_id }) => {
  return text(await client.get(`/clients/${client_id}/notes`))
})

server.tool('create_note', 'Create a meeting note for a client', {
  client_id: z.string(),
  title: z.string().optional(),
  content: z.string().describe('Note content'),
  meeting_date: z.string().optional().describe('YYYY-MM-DD'),
}, async ({ client_id, ...body }) => {
  return text(await client.post(`/clients/${client_id}/notes`, body))
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('PreRoll MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
