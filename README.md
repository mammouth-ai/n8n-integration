# Mammouth for n8n

<a href="https://mammouth.ai/">
  <img src="https://mammouth.ai/logos/mammouth-ai-logo.png" alt="Mammouth AI — official website" width="200">
</a>

**[Discover Mammouth AI](https://mammouth.ai/)**

Community nodes for using [Mammouth AI](https://mammouth.ai/) (or any API
compatible with the OpenAI protocol) in n8n. The package contains two nodes:

- **Mammouth**: an action node (Chat, Image, Text) to add to a workflow.
- **Mammouth Chat Model**: a **Chat Model** sub-node to connect to an **AI Agent**
  or an n8n **Chain**.

Open source: https://github.com/mammouth-ai/n8n-integration

## Install the published package

The npm package is available as
[`n8n-nodes-mammouth`](https://www.npmjs.com/package/n8n-nodes-mammouth).

On a self-hosted n8n instance that allows community nodes:

1. Open **Settings → Community Nodes → Install**.
2. Enter `n8n-nodes-mammouth` and confirm the installation.
3. Create the **Mammouth API** credentials described below.
4. Add the **Mammouth** node to a workflow.

Building from source, as described below, is an alternative for development or
loading the node as a custom extension.

## Build and verify

Node.js 24 or later and npm are required (a dependency of the n8n SDK requires
Node.js 24). Also use a Node.js version supported by your n8n installation.
The package is built and tested with `n8n-workflow` 2.42.1; compatibility with
your exact n8n version should be verified on your instance.

The examples assume the project is located at `$HOME/n8n-integration`.
`$HOME` refers to the current user's home directory; adjust the path to the
location of your project copy.

```bash
cd "$HOME/n8n-integration"
npm ci
npm test
```

The build outputs the node, its credentials, icons, and metadata to
`$HOME/n8n-integration/dist`.

## Load in an npm / Node.js installation of n8n

On the machine running n8n, after building, set the custom extensions directory
at startup:

```bash
export N8N_CUSTOM_EXTENSIONS="$HOME/n8n-integration/dist"
n8n start
```

Stop any existing instance first; do not start a second process on the same
port. If n8n is managed by systemd or PM2, add this variable to that service's
configuration and restart it with its service manager. A simple `export` in a
terminal does not change a service's environment.

- Run n8n as its usual user to preserve access to its data.
- The path above is an example; adjust it if n8n runs elsewhere.
- In a service configuration, use the actual absolute path if the service
  manager does not expand `$HOME`.
- Keep this project's dependencies installed and make the project readable by
  the n8n service user.
- If `N8N_CUSTOM_EXTENSIONS` already contains paths, append this directory,
  separating paths with `;`, without removing existing extensions.
- Rebuild and restart n8n after every change.
- Reload the UI and search for **Mammouth** in the node selector.

Loading as a custom extension does not require publishing to npm. `npm pack`
also creates an installable archive for deployment as a community package. Do
not load the same node simultaneously as a custom extension and a community
package; their workflow identifiers differ (`CUSTOM.mammouth` and
`n8n-nodes-mammouth.mammouth`).

## API credentials

Create **Mammouth API** credentials and provide:

- **API Base URL**: `https://api.mammouth.ai/v1` for the official Mammouth API.
  For an OpenAI-compatible API hosted elsewhere, enter its complete base URL,
  including its version prefix if required.
- **API Key**: the key sent in `Authorization: Bearer …`. Find it in your
  Mammouth account's API settings on [mammouth.ai](https://mammouth.ai/). The
  key is stored in n8n credentials and should not be written into a workflow
  field.

The credential test button calls
`GET https://api.mammouth.ai/v1/models` to verify the key and API access.

## Example: Mammouth node (reply to a message)

1. Add an **Edit Fields** node and create these fields:

   ```json
   {
     "name": "Camille",
     "message": "Can I move my appointment to Friday?"
   }
   ```

2. Connect it to a **Mammouth** node, then choose **Chat → Send Message**.
3. Select the **Mammouth API** credentials above and a model from the list of
   available models.
4. Add two messages:
   - **Instructions (System)**: `You are a support assistant. Be concise.`
   - **User**: `Reply to {{ $json.name }}: {{ $json.message }}`
5. Run the workflow. With **Return Only the Reply** enabled, the response is
   available in `message.content` in the node output.

## Example: Mammouth Chat Model with an AI Agent

1. Add a **Chat Trigger** and connect it to the main input of an **AI Agent**.
2. Add a **Mammouth Chat Model**, select the same **Mammouth API** credentials,
   and choose an available model.
3. Connect the sub-node's **Model** output to the AI Agent's **Chat Model**
   input.
4. In the AI Agent, use `{{ $json.chatInput }}` as the user prompt. In the Chat
   Trigger, try: “Give me three ideas for quick vegetarian meals.”
5. Run the workflow and check the AI Agent's response. Mammouth Chat Model
   provides the agent's language model; it does not connect to the workflow's
   main output.

## Which operation should I choose?

| I want to… | Resource → Operation |
| --- | --- |
| Generate text (an email, summary, translation, customer reply, data extraction…) | **Chat → Send Message** |
| Analyze an email with all its attached images | **Image → Analyze** |
| Describe, read, or compare one or more images | **Image → Analyze** |
| Create an image from a description | **Image → Generate** |
| Check whether text contains hateful, violent, sexual, or other unsafe content | **Text → Check Content Safety** |
| Correct or rephrase text based on an instruction | **Chat → Send Message** (or **Text → Edit** if the API supports it) |
| Use Mammouth as the brain of an AI Agent | **Mammouth Chat Model** node |

**If in doubt, use Chat → Send Message**: it is the most versatile and best
supported operation.

### Chat → Send Message

Sends a conversation to a model and returns its response. Each message has a
sender (**From**):

- **Instructions (System)**: general instructions (role, tone, language,
  format). Example: “You are a customer support agent. Be concise and use at
  most five lines.”
- **User**: the request. Example: `Reply to this email: {{ $json.text }}`.
- **AI (Assistant)**: a previous model response, to continue a conversation.

Consider increasing **Maximum Response Length** in the options: the default
value (16 tokens, about 60 characters) truncates most responses.

### Image → Analyze

Sends text and multiple images in a single request to a model that can read
images (GPT-4o, Claude, Gemini…). A typical use case is an email and its
attachments.

1. Before this node, add a node that reads emails (Gmail, IMAP…) with attachment
   downloads enabled.
2. **Instruction / Text**: `Summarize this email and its attachments: {{ $json.text }}`.
3. **Images to Send**:
   - **All Images From Previous Node**: all images in the item (PDFs and other
     files are ignored).
   - **Specific Files**: only the listed fields (`attachment_0, attachment_1`).
   - **Image URLs**: public links, separated by commas.
   - **No Image (Text Only)**: text only.
4. Useful options: **Image Detail Level** (**Low** costs less; **High** is
   needed to read small text or an invoice), **Maximum Answer Length** (300
   tokens by default), and **Model Instructions**.

The response is in the `content` field.

### Image → Generate

Creates one or more images from a description. **Return Image As**: **File**
(ready to attach to an email or upload) or **Image URL** (a temporary link).

### Text (advanced)

Legacy operations that are less useful day to day:

- **Continue**: the model *continues* the supplied text (autocomplete). It does
  not follow instructions: “Dear customer, regarding your order” works, while
  “Write an email” does not. Use Chat to request generated text.
- **Edit**: rewrites text based on an instruction. Requires the `/edits`
  endpoint, which is rarely available; Chat does the same thing.
- **Check Content Safety** (moderation): **does not generate text**. It reports
  whether text contains hate, harassment, violence, sexual content, or
  self-harm, by category. Useful for filtering user messages before replying.
  Requires a moderation model (e.g. `omni-moderation-latest`), not a chat model.

### Common options (Chat and Text)

| Option | Effect |
| --- | --- |
| Creativity (Temperature) | Lower values give more precise and consistent answers; higher values give more varied answers |
| Word Choice Diversity (Top P) | Limits word choice to the most likely options; change this **or** temperature |
| Avoid Repetition (Frequency Penalty) | Reduces repeated words and phrases |
| Encourage New Topics (Presence Penalty) | Encourages the model to address new topics |
| Maximum Response Length (Tokens) | Maximum response length (1 token ≈ 4 characters) |
| Number of Replies / Results | Number of generated variants (each consumes tokens) |

The technical parameter names are unchanged, so existing workflows continue
to work despite the updated labels.

## Endpoints and limitations

The following paths are appended to the base URL:

| Function | Method and path |
| --- | --- |
| List models and test credentials | `GET /models` |
| Chat and image analysis | `POST /chat/completions` |
| Image generation | `POST /images/generations` |
| Text completion | `POST /completions` |
| Text editing | `POST /edits` |
| Moderation | `POST /moderations` |

The model list expects `{ "data": [{ "id": "model-id" }] }`. It does not filter
by brand; choose a model compatible with the operation. Editing and moderation
require a manually entered model ID.

Operations and options are inherited from the original node. Chat Completions
compatibility does not guarantee support for the legacy editing, text, or
moderation endpoints, or for image parameters. DALL-E-specific options depend
on the models in use. Only features actually exposed by your API will work; no
additional support is implied.

Tests verify the build, exports, assets, n8n expressions, authentication,
models, and HTTP errors. A local HTTP server simulates the model and chat
endpoints using the node's configuration; this test does not replace running
the n8n routing engine or calling your API.

## License and trademarks

The package is published under the MIT license. Also verify the licensing and
attribution requirements for upstream code before redistribution.

The Mammouth name and logo belong to their respective owners. A link to the
official website does not imply certification of this integration.
