import { expect, test } from "@jest/globals";
import {
  AIMessage,
  BaseMessage,
  BaseMessageLike,
  HumanMessage,
  HumanMessageChunk,
  MessageContentComplex,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { InMemoryStore } from "@langchain/core/stores";
import { CallbackHandlerMethods } from "@langchain/core/callbacks/base";
import { Serialized } from "@langchain/core/load/serializable";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ChatGoogleBase, ChatGoogleBaseInput } from "../chat_models.js";
import { authOptions, MockClient, MockClientAuthInfo, mockId } from "./mock.js";
import {
  GeminiTool,
  GoogleAIBaseLLMInput,
  GoogleAISafetyHandler,
} from "../types.js";
import { GoogleAbstractedClient } from "../auth.js";
import { GoogleAISafetyError } from "../utils/safety.js";
import {
  BackedBlobStore,
  MediaBlob,
  MediaManager,
  ReadThroughBlobStore,
} from "../experimental/utils/media_core.js";
import { removeAdditionalProperties } from "../utils/zod_to_gemini_parameters.js";
import { MessageGeminiSafetyHandler } from "../utils/index.js";

class ChatGoogle extends ChatGoogleBase<MockClientAuthInfo> {
  constructor(fields?: ChatGoogleBaseInput<MockClientAuthInfo>) {
    super(fields);
  }

  buildAbstractedClient(
    fields?: GoogleAIBaseLLMInput<MockClientAuthInfo>
  ): GoogleAbstractedClient {
    const options = authOptions(fields);
    return new MockClient(options);
  }
}

describe("Mock ChatGoogle - Gemini", () => {
  test("Setting invalid model parameters", async () => {
    expect(() => {
      const model = new ChatGoogle({
        temperature: 1.2,
      });
      expect(model).toBeNull(); // For linting. Should never reach.
    }).toThrowError(/temperature/);

    expect(() => {
      const model = new ChatGoogle({
        topP: -2,
      });
      expect(model).toBeNull(); // For linting. Should never reach.
    }).toThrowError(/topP/);

    expect(() => {
      const model = new ChatGoogle({
        topP: 2,
      });
      expect(model).toBeNull(); // For linting. Should never reach.
    }).toThrowError(/topP/);

    expect(() => {
      const model = new ChatGoogle({
        topK: -2,
      });
      expect(model).toBeNull(); // For linting. Should never reach.
    }).toThrowError(/topK/);
  });

  test("user agent header", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
    });
    const messages: BaseMessageLike[] = [
      new HumanMessage("Flip a coin and tell me H for heads and T for tails"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    await model.invoke(messages);

    expect(record?.opts?.headers).toHaveProperty("User-Agent");
    expect(record?.opts?.headers).toHaveProperty("Client-Info");
    expect(record.opts.headers["User-Agent"]).toMatch(
      /langchain-js\/[0-9.]+-ChatConnection/
    );
    expect(record.opts.headers["Client-Info"]).toMatch(
      /\d+(\.\d+)?-ChatConnection/ // Since we are not getting libraryVersion from env right now, it will always be 0
    );
  });

  test("platform default", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
    };
    const model = new ChatGoogle({
      authOptions,
    });

    expect(model.platform).toEqual("gcp");
  });

  test("platform set", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
    };
    const model = new ChatGoogle({
      authOptions,
      platformType: "gai",
    });

    expect(model.platform).toEqual("gai");
  });

  test("1. Basic request format", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
    });
    const messages: BaseMessageLike[] = [
      new HumanMessage("Flip a coin and tell me H for heads and T for tails"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    await model.invoke(messages);

    expect(record.opts).toBeDefined();
    expect(record.opts.data).toBeDefined();
    const { data } = record.opts;
    expect(data.contents).toBeDefined();
    expect(data.contents.length).toEqual(3);
    expect(data.contents[0].role).toEqual("user");
    expect(data.contents[0].parts).toBeDefined();
    expect(data.contents[0].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[0].parts[0].text).toBeDefined();
    expect(data.contents[1].role).toEqual("model");
    expect(data.contents[1].parts).toBeDefined();
    expect(data.contents[1].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.systemInstruction).not.toBeDefined();
  });

  test("1. Invoke request format", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
    });
    const messages: BaseMessageLike[] = [
      new HumanMessage("Flip a coin and tell me H for heads and T for tails"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    await model.invoke(messages);

    expect(record.opts).toBeDefined();
    expect(record.opts.data).toBeDefined();
    const { data } = record.opts;
    expect(data.contents).toBeDefined();
    expect(data.contents.length).toEqual(3);
    expect(data.contents[0].role).toEqual("user");
    expect(data.contents[0].parts).toBeDefined();
    expect(data.contents[0].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[0].parts[0].text).toBeDefined();
    expect(data.contents[1].role).toEqual("model");
    expect(data.contents[1].parts).toBeDefined();
    expect(data.contents[1].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.systemInstruction).not.toBeDefined();
  });

  test("1. Response format", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
    });
    const messages: BaseMessageLike[] = [
      new HumanMessage("Flip a coin and tell me H for heads and T for tails"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    const result = await model.invoke(messages);

    expect(result._getType()).toEqual("ai");
    const aiMessage = result as AIMessage;
    expect(aiMessage.content).toBeDefined();
    expect(aiMessage.content).toBe("T");
  });

  test("1. Invoke response format", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
    });
    const messages: BaseMessageLike[] = [
      new HumanMessage("Flip a coin and tell me H for heads and T for tails"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    const result = await model.invoke(messages);

    expect(result._getType()).toEqual("ai");
    const aiMessage = result as AIMessage;
    expect(aiMessage.content).toBeDefined();
    expect(aiMessage.content).toBe("T");
  });

  // The older models don't support systemInstruction, so
  // SystemMessages will be turned into the human request with the prompt
  // from the system message and a faked ai response saying "Ok".
  test("1. System request format old model", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      modelName: "gemini-1.0-pro-001",
    });
    const messages: BaseMessageLike[] = [
      new SystemMessage(
        "I will ask you to flip a coin and tell me H for heads and T for tails"
      ),
      new HumanMessage("Flip it"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    await model.invoke(messages);

    expect(record.opts).toBeDefined();
    expect(record.opts.data).toBeDefined();
    const { data } = record.opts;
    expect(data.contents).toBeDefined();
    expect(data.contents.length).toEqual(5);
    expect(data.contents[0].role).toEqual("user");
    expect(data.contents[0].parts).toBeDefined();
    expect(data.contents[0].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[0].parts[0].text).toEqual(
      "I will ask you to flip a coin and tell me H for heads and T for tails"
    );
    expect(data.contents[1].role).toEqual("model");
    expect(data.contents[1].parts).toBeDefined();
    expect(data.contents[1].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[1].parts[0].text).toEqual("Ok");
    expect(data.systemInstruction).not.toBeDefined();
  });

  test("1. System request format convert true", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      convertSystemMessageToHumanContent: true,
    });
    const messages: BaseMessageLike[] = [
      new SystemMessage(
        "I will ask you to flip a coin and tell me H for heads and T for tails"
      ),
      new HumanMessage("Flip it"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    await model.invoke(messages);

    expect(record.opts).toBeDefined();
    expect(record.opts.data).toBeDefined();
    const { data } = record.opts;
    expect(data.contents).toBeDefined();
    expect(data.contents.length).toEqual(5);
    expect(data.contents[0].role).toEqual("user");
    expect(data.contents[0].parts).toBeDefined();
    expect(data.contents[0].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[0].parts[0].text).toEqual(
      "I will ask you to flip a coin and tell me H for heads and T for tails"
    );
    expect(data.contents[1].role).toEqual("model");
    expect(data.contents[1].parts).toBeDefined();
    expect(data.contents[1].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[1].parts[0].text).toEqual("Ok");
    expect(data.systemInstruction).not.toBeDefined();
  });

  test("1. System request format convert false", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      convertSystemMessageToHumanContent: false,
    });
    const messages: BaseMessageLike[] = [
      new SystemMessage(
        "I will ask you to flip a coin and tell me H for heads and T for tails"
      ),
      new HumanMessage("Flip it"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    await model.invoke(messages);

    expect(record.opts).toBeDefined();
    expect(record.opts.data).toBeDefined();
    const { data } = record.opts;
    expect(data.contents).toBeDefined();
    expect(data.contents.length).toEqual(3);
    expect(data.contents[0].role).toEqual("user");
    expect(data.contents[0].parts).toBeDefined();
    expect(data.contents[0].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[0].parts[0].text).toEqual("Flip it");
    expect(data.contents[1].role).toEqual("model");
    expect(data.contents[1].parts).toBeDefined();
    expect(data.contents[1].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[1].parts[0].text).toEqual("H");
    expect(data.systemInstruction).toBeDefined();
  });

  test("1. System request format new model", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      modelName: "gemini-1.5-pro",
    });
    const messages: BaseMessageLike[] = [
      new SystemMessage(
        "I will ask you to flip a coin and tell me H for heads and T for tails"
      ),
      new HumanMessage("Flip it"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    await model.invoke(messages);

    expect(record.opts).toBeDefined();
    expect(record.opts.data).toBeDefined();
    const { data } = record.opts;
    expect(data.contents).toBeDefined();
    expect(data.contents.length).toEqual(3);
    expect(data.contents[0].role).toEqual("user");
    expect(data.contents[0].parts).toBeDefined();
    expect(data.contents[0].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[0].parts[0].text).toEqual("Flip it");
    expect(data.contents[1].role).toEqual("model");
    expect(data.contents[1].parts).toBeDefined();
    expect(data.contents[1].parts.length).toBeGreaterThanOrEqual(1);
    expect(data.contents[1].parts[0].text).toEqual("H");
    expect(data.systemInstruction).toBeDefined();
  });

  test("1. System request - multiple", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      convertSystemMessageToHumanContent: false,
    });
    const messages: BaseMessageLike[] = [
      new SystemMessage(
        "I will ask you to flip a coin and tell me H for heads and T for tails"
      ),
      new HumanMessage("Flip it"),
      new AIMessage("H"),
      new SystemMessage("Now tell me Z for heads and Q for tails"),
      new HumanMessage("Flip it again"),
    ];

    let caught = false;
    try {
      await model.invoke(messages);
    } catch (xx) {
      caught = true;
    }
    expect(caught).toBeTruthy();
  });

  test("1. System request - not first", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-1-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      convertSystemMessageToHumanContent: false,
    });
    const messages: BaseMessageLike[] = [
      new HumanMessage("Flip it"),
      new AIMessage("H"),
      new SystemMessage("Now tell me Z for heads and Q for tails"),
      new HumanMessage("Flip it again"),
    ];

    let caught = false;
    try {
      await model.invoke(messages);
    } catch (xx) {
      caught = true;
    }
    expect(caught).toBeTruthy();
  });

  test("2. Safety - default", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-2-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
    });
    const messages: BaseMessageLike[] = [
      new HumanMessage("Flip a coin and tell me H for heads and T for tails"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    let caught = false;
    try {
      await model.invoke(messages);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (xx: any) {
      caught = true;
      expect(xx).toBeInstanceOf(GoogleAISafetyError);

      const result = xx?.reply.generations[0];
      expect(result).toBeUndefined();
    }

    expect(caught).toEqual(true);
  });

  test("2. Safety - safety handler", async () => {
    const safetyHandler: GoogleAISafetyHandler = new MessageGeminiSafetyHandler(
      {
        msg: "I'm sorry, Dave, but I can't do that.",
      }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-2-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      safetyHandler,
    });
    const messages: BaseMessageLike[] = [
      new HumanMessage("Flip a coin and tell me H for heads and T for tails"),
      new AIMessage("H"),
      new HumanMessage("Flip it again"),
    ];
    let caught = false;
    try {
      const result = await model.invoke(messages);

      expect(result._getType()).toEqual("ai");
      const aiMessage = result as AIMessage;
      expect(aiMessage.content).toBeDefined();
      expect(aiMessage.content).toBe("I'm sorry, Dave, but I can't do that.");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (xx: any) {
      caught = true;
    }

    expect(caught).toEqual(false);
  });

  test("3. invoke - images", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-3-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      model: "gemini-1.5-flash",
    });

    const message: MessageContentComplex[] = [
      {
        type: "text",
        text: "What is in this image?",
      },
      {
        type: "image_url",
        image_url: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AIbFwQSRaexCAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAJklEQVQY02P8//8/A27AxIAXsEAor31f0CS2OfEQ1j2Q0owU+RsAGNUJD2/04PgAAAAASUVORK5CYII=`,
      },
    ];

    const messages: BaseMessage[] = [
      new HumanMessageChunk({ content: message }),
    ];

    const result = await model.invoke(messages);

    expect(record.opts).toHaveProperty("data");
    expect(record.opts.data).toHaveProperty("contents");
    expect(record.opts.data.contents).toHaveLength(1);
    expect(record.opts.data.contents[0]).toHaveProperty("parts");

    const parts = record?.opts?.data?.contents[0]?.parts;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveProperty("text");
    expect(parts[1]).toHaveProperty("inlineData");
    expect(parts[1].inlineData).toHaveProperty("mimeType");
    expect(parts[1].inlineData).toHaveProperty("data");

    expect(result.content).toBe("A blue square.");
  });

  test("3. invoke - media - invalid", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-3-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      model: "gemini-1.5-flash",
    });

    const message: MessageContentComplex[] = [
      {
        type: "text",
        text: "What is in this image?",
      },
      {
        type: "media",
        fileUri: "mock://example.com/blue-box.png",
      },
    ];

    const messages: BaseMessage[] = [
      new HumanMessageChunk({ content: message }),
    ];

    try {
      const result = await model.invoke(messages);
      expect(result).toBeUndefined();
    } catch (e) {
      expect((e as Error).message).toMatch(/^Invalid media content/);
    }
  });

  test("3. invoke - media - no manager", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-3-mock.json",
    };
    const model = new ChatGoogle({
      authOptions,
      model: "gemini-1.5-flash",
    });

    const message: MessageContentComplex[] = [
      {
        type: "text",
        text: "What is in this image?",
      },
      {
        type: "media",
        fileUri: "mock://example.com/blue-box.png",
        mimeType: "image/png",
      },
    ];

    const messages: BaseMessage[] = [
      new HumanMessageChunk({ content: message }),
    ];

    const result = await model.invoke(messages);

    console.log(JSON.stringify(record.opts, null, 1));

    expect(record.opts).toHaveProperty("data");
    expect(record.opts.data).toHaveProperty("contents");
    expect(record.opts.data.contents).toHaveLength(1);
    expect(record.opts.data.contents[0]).toHaveProperty("parts");

    const parts = record?.opts?.data?.contents[0]?.parts;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveProperty("text");
    expect(parts[1]).toHaveProperty("fileData");
    expect(parts[1].fileData).toHaveProperty("mimeType");
    expect(parts[1].fileData).toHaveProperty("fileUri");

    expect(result.content).toBe("A blue square.");
  });

  test("3. invoke - media - manager", async () => {
    class MemStore extends InMemoryStore<MediaBlob> {
      get length() {
        return Object.keys(this.store).length;
      }
    }

    const aliasMemory = new MemStore();
    const aliasStore = new BackedBlobStore({
      backingStore: aliasMemory,
      defaultFetchOptions: {
        actionIfBlobMissing: undefined,
      },
    });
    const canonicalMemory = new MemStore();
    const canonicalStore = new BackedBlobStore({
      backingStore: canonicalMemory,
      defaultStoreOptions: {
        pathPrefix: "canonical://store/",
        actionIfInvalid: "prefixPath",
      },
      defaultFetchOptions: {
        actionIfBlobMissing: undefined,
      },
    });
    const blobStore = new ReadThroughBlobStore({
      baseStore: aliasStore,
      backingStore: canonicalStore,
    });
    const resolverMemory = new MemStore();
    const resolver = new BackedBlobStore({
      backingStore: resolverMemory,
      defaultFetchOptions: {
        actionIfBlobMissing: "emptyBlob",
      },
    });
    const mediaManager = new MediaManager({
      store: blobStore,
      resolvers: [resolver],
    });

    async function store(path: string, text: string): Promise<void> {
      const type = path.endsWith(".png") ? "image/png" : "text/plain";
      const data = new Blob([text], { type });
      const blob = await MediaBlob.fromBlob(data, { path });
      await resolver.store(blob);
    }
    await store("resolve://host/foo", "fooing");
    await store("resolve://host2/bar/baz", "barbazing");
    await store("resolve://host/foo/blue-box.png", "png");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-3-mock.json",
    };
    const callbacks: CallbackHandlerMethods[] = [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handleChatModelStart(
          llm: Serialized,
          messages: BaseMessage[][],
          runId: string,
          _parentRunId?: string,
          _extraParams?: Record<string, unknown>,
          _tags?: string[],
          _metadata?: Record<string, unknown>,
          _runName?: string
        ): any {
          console.log("Chat start", llm, messages, runId);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handleCustomEvent(
          eventName: string,
          data: any,
          runId: string,
          tags?: string[],
          metadata?: Record<string, any>
        ): any {
          console.log("Custom event", eventName, runId, data, tags, metadata);
        },
      },
    ];
    const model = new ChatGoogle({
      authOptions,
      model: "gemini-1.5-flash",
      apiConfig: {
        mediaManager,
      },
      callbacks,
    });

    const message: MessageContentComplex[] = [
      {
        type: "text",
        text: "What is in this image?",
      },
      {
        type: "media",
        fileUri: "resolve://host/foo/blue-box.png",
      },
    ];

    const messages: BaseMessage[] = [
      new HumanMessageChunk({ content: message }),
    ];

    const result = await model.invoke(messages);

    console.log(JSON.stringify(record.opts, null, 1));

    expect(record.opts).toHaveProperty("data");
    expect(record.opts.data).toHaveProperty("contents");
    expect(record.opts.data.contents).toHaveLength(1);
    expect(record.opts.data.contents[0]).toHaveProperty("parts");

    const parts = record?.opts?.data?.contents[0]?.parts;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveProperty("text");
    expect(parts[1]).toHaveProperty("fileData");
    expect(parts[1].fileData).toHaveProperty("mimeType");
    expect(parts[1].fileData.mimeType).toEqual("image/png");
    expect(parts[1].fileData).toHaveProperty("fileUri");
    expect(parts[1].fileData.fileUri).toEqual(
      "canonical://store/host/foo/blue-box.png"
    );

    expect(result.content).toBe("A blue square.");
  });

  test("4. Functions Bind - Gemini format request", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-4-mock.json",
    };

    const tools: GeminiTool[] = [
      {
        functionDeclarations: [
          {
            name: "test",
            description:
              "Run a test with a specific name and get if it passed or failed",
            parameters: {
              type: "object",
              properties: {
                testName: {
                  type: "string",
                  description: "The name of the test that should be run.",
                },
              },
              required: ["testName"],
            },
          },
        ],
      },
    ];

    const baseModel = new ChatGoogle({
      authOptions,
    });
    const model = baseModel.bind({
      tools,
    });

    const result = await model.invoke("What?");

    // console.log(JSON.stringify(record, null, 1));

    expect(result).toBeDefined();

    const toolsResult = record?.opts?.data?.tools;
    expect(toolsResult).toBeDefined();
    expect(Array.isArray(toolsResult)).toBeTruthy();
    expect(toolsResult).toHaveLength(1);

    const toolResult = toolsResult[0];
    expect(toolResult).toBeDefined();
    expect(toolResult).toHaveProperty("functionDeclarations");
    expect(Array.isArray(toolResult.functionDeclarations)).toBeTruthy();
    expect(toolResult.functionDeclarations).toHaveLength(1);

    const functionDeclaration = toolResult.functionDeclarations[0];
    expect(functionDeclaration.name).toBe("test");
    expect(functionDeclaration.description).toBe(
      "Run a test with a specific name and get if it passed or failed"
    );
    expect(functionDeclaration.parameters).toBeDefined();
    expect(typeof functionDeclaration.parameters).toBe("object");

    const parameters = functionDeclaration?.parameters;
    expect(parameters.type).toBe("object");
    expect(parameters).toHaveProperty("properties");
    expect(typeof parameters.properties).toBe("object");

    expect(parameters.properties.testName).toBeDefined();
    expect(typeof parameters.properties.testName).toBe("object");
    expect(parameters.properties.testName.type).toBe("string");
    expect(parameters.properties.testName.description).toBe(
      "The name of the test that should be run."
    );

    expect(parameters.required).toBeDefined();
    expect(Array.isArray(parameters.required)).toBeTruthy();
    expect(parameters.required).toHaveLength(1);
    expect(parameters.required[0]).toBe("testName");
  });

  test("4. Functions withStructuredOutput - Gemini format request", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-4-mock.json",
    };

    const tool = {
      name: "test",
      description:
        "Run a test with a specific name and get if it passed or failed",
      parameters: {
        type: "object",
        properties: {
          testName: {
            type: "string",
            description: "The name of the test that should be run.",
          },
        },
        required: ["testName"],
      },
    };

    const baseModel = new ChatGoogle({
      authOptions,
    });
    const model = baseModel.withStructuredOutput(tool);

    await model.invoke("What?");

    // console.log(JSON.stringify(record, null, 1));

    const toolsResult = record?.opts?.data?.tools;
    expect(toolsResult).toBeDefined();
    expect(Array.isArray(toolsResult)).toBeTruthy();
    expect(toolsResult).toHaveLength(1);

    const toolResult = toolsResult[0];
    expect(toolResult).toBeDefined();
    expect(toolResult).toHaveProperty("functionDeclarations");
    expect(Array.isArray(toolResult.functionDeclarations)).toBeTruthy();
    expect(toolResult.functionDeclarations).toHaveLength(1);

    const functionDeclaration = toolResult.functionDeclarations[0];
    expect(functionDeclaration.name).toBe("test");
    expect(functionDeclaration.description).toBe(
      "Run a test with a specific name and get if it passed or failed"
    );
    expect(functionDeclaration.parameters).toBeDefined();
    expect(typeof functionDeclaration.parameters).toBe("object");

    const parameters = functionDeclaration?.parameters;
    expect(parameters.type).toBe("object");
    expect(parameters).toHaveProperty("properties");
    expect(typeof parameters.properties).toBe("object");

    expect(parameters.properties.testName).toBeDefined();
    expect(typeof parameters.properties.testName).toBe("object");
    expect(parameters.properties.testName.type).toBe("string");
    expect(parameters.properties.testName.description).toBe(
      "The name of the test that should be run."
    );

    expect(parameters.required).toBeDefined();
    expect(Array.isArray(parameters.required)).toBeTruthy();
    expect(parameters.required).toHaveLength(1);
    expect(parameters.required[0]).toBe("testName");
  });

  test("4. Functions - results", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-4-mock.json",
    };

    const tools: GeminiTool[] = [
      {
        functionDeclarations: [
          {
            name: "test",
            description:
              "Run a test with a specific name and get if it passed or failed",
            parameters: {
              type: "object",
              properties: {
                testName: {
                  type: "string",
                  description: "The name of the test that should be run.",
                },
              },
              required: ["testName"],
            },
          },
        ],
      },
    ];

    const model = new ChatGoogle({
      authOptions,
    }).bind({
      tools,
    });

    const result = await model.invoke("What?");

    // console.log(JSON.stringify(result, null, 1));
    expect(result).toHaveProperty("content");
    expect(result.content).toBe("");
    const args = result?.lc_kwargs?.additional_kwargs;
    expect(args).toBeDefined();
    expect(args).toHaveProperty("tool_calls");
    expect(Array.isArray(args.tool_calls)).toBeTruthy();
    expect(args.tool_calls).toHaveLength(1);
    const call = args.tool_calls[0];
    expect(call).toHaveProperty("type");
    expect(call.type).toBe("function");
    expect(call).toHaveProperty("function");
    const func = call.function;
    expect(func).toBeDefined();
    expect(func).toHaveProperty("name");
    expect(func.name).toBe("test");
    expect(func).toHaveProperty("arguments");
    expect(typeof func.arguments).toBe("string");
    expect(func.arguments.replaceAll("\n", "")).toBe('{"testName":"cobalt"}');
  });

  test("5. Functions - function reply", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "chat-5-mock.json",
    };

    const tools: GeminiTool[] = [
      {
        functionDeclarations: [
          {
            name: "test",
            description:
              "Run a test with a specific name and get if it passed or failed",
            parameters: {
              type: "object",
              properties: {
                testName: {
                  type: "string",
                  description: "The name of the test that should be run.",
                },
              },
              required: ["testName"],
            },
          },
        ],
      },
    ];

    const model = new ChatGoogle({
      authOptions,
    }).bind({
      tools,
    });
    const toolResult = {
      testPassed: true,
    };
    const messages: BaseMessageLike[] = [
      new HumanMessage("Run a test on the cobalt project."),
      new AIMessage("", {
        tool_calls: [
          {
            id: "test",
            type: "function",
            function: {
              name: "test",
              arguments: '{"testName":"cobalt"}',
            },
          },
        ],
      }),
      new ToolMessage(JSON.stringify(toolResult), "test"),
    ];
    const result = await model.invoke(messages);
    expect(result).toBeDefined();

    // console.log(JSON.stringify(record?.opts?.data, null, 1));
  });
});

describe("Mock ChatGoogle - Anthropic", () => {
  test("1. Invoke request format", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "claude-chat-1-mock.json",
    };
    const model = new ChatGoogle({
      model: "claude-3-5-sonnet@20240620",
      platformType: "gcp",
      authOptions,
    });
    const messages: BaseMessageLike[] = [new HumanMessage("What is 1+1?")];
    await model.invoke(messages);

    console.log("record", record);
    expect(record.opts).toBeDefined();
    expect(record.opts.data).toBeDefined();
    const { data } = record.opts;
    expect(data.messages).toBeDefined();
    expect(data.messages.length).toEqual(1);
    expect(data.messages[0].role).toEqual("user");
    expect(data.messages[0].content).toBeDefined();
    expect(data.messages[0].content.length).toBeGreaterThanOrEqual(1);
    expect(data.messages[0].content[0].text).toBeDefined();
    expect(data.system).not.toBeDefined();
  });

  test("1. Invoke response format", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record: Record<string, any> = {};
    const projectId = mockId();
    const authOptions: MockClientAuthInfo = {
      record,
      projectId,
      resultFile: "claude-chat-1-mock.json",
    };
    const model = new ChatGoogle({
      model: "claude-3-5-sonnet@20240620",
      platformType: "gcp",
      authOptions,
    });
    const messages: BaseMessageLike[] = [new HumanMessage("What is 1+1?")];
    const result = await model.invoke(messages);

    expect(result._getType()).toEqual("ai");
    const aiMessage = result as AIMessage;
    expect(aiMessage.content).toBeDefined();
    expect(aiMessage.content).toBe(
      "1 + 1 = 2\n\nThis is one of the most basic arithmetic equations. It represents the addition of two units, resulting in a sum of two."
    );
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractKeys(obj: Record<string, any>, keys: string[] = []) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(key);
      if (typeof obj[key] === "object" && obj[key] !== null) {
        extractKeys(obj[key], keys);
      }
    }
  }
  return keys;
}

test("removeAdditionalProperties can remove all instances of additionalProperties", async () => {
  const idealResponseSchema = z.object({
    idealResponse: z
      .string()
      .optional()
      .describe("The ideal response to the question"),
  });
  const questionSchema = z.object({
    question: z.string().describe("Question text"),
    type: z.enum(["singleChoice", "multiChoice"]).describe("Question type"),
    options: z.array(z.string()).describe("List of possible answers"),
    correctAnswer: z
      .string()
      .optional()
      .describe("correct answer from the possible answers"),
    idealResponses: z
      .array(idealResponseSchema)
      .describe("Array of ideal responses to the question"),
  });

  const schema = z.object({
    questions: z.array(questionSchema).describe("Array of question objects"),
  });

  const parsedSchemaArr = removeAdditionalProperties(zodToJsonSchema(schema));
  const arrSchemaKeys = extractKeys(parsedSchemaArr);
  expect(
    arrSchemaKeys.find((key) => key === "additionalProperties")
  ).toBeUndefined();
  const parsedSchemaObj = removeAdditionalProperties(
    zodToJsonSchema(questionSchema)
  );
  const arrSchemaObj = extractKeys(parsedSchemaObj);
  expect(
    arrSchemaObj.find((key) => key === "additionalProperties")
  ).toBeUndefined();

  const analysisSchema = z.object({
    decision: z.enum(["UseAPI", "UseFallback"]),
    explanation: z.string(),
    apiDetails: z
      .object({
        serviceName: z.string(),
        endpointName: z.string(),
        parameters: z.record(z.unknown()),
        extractionPath: z.string(),
      })
      .optional(),
  });
  const parsedAnalysisSchema = removeAdditionalProperties(
    zodToJsonSchema(analysisSchema)
  );
  const analysisSchemaObj = extractKeys(parsedAnalysisSchema);
  expect(
    analysisSchemaObj.find((key) => key === "additionalProperties")
  ).toBeUndefined();
});

test("Can set streaming param", () => {
  const modelWithStreamingDefault = new ChatGoogle();

  expect(modelWithStreamingDefault.streaming).toBe(false);

  const modelWithStreamingTrue = new ChatGoogle({
    streaming: true,
  });
  expect(modelWithStreamingTrue.streaming).toBe(true);
});
