import { describe, expect, it } from "vitest";
import { excerpt, htmlToText } from "./text";

describe("htmlToText", () => {
  it("keeps paragraphs and line breaks", () => {
    expect(htmlToText("<p>Hello all,</p><p>Room change:<br>we meet in 2.04.</p>")).toBe("Hello all,\nRoom change:\nwe meet in 2.04.");
  });

  it("turns list items into bullets", () => {
    expect(htmlToText("<ul><li>Bring a laptop</li><li>Read ch. 3</li></ul>")).toBe("• Bring a laptop\n• Read ch. 3");
  });

  it("decodes entities", () => {
    expect(htmlToText("<p>Q&amp;A &ndash; 5&nbsp;pm &#8220;sharp&#8221; &#x2713; &unknown;</p>")).toBe("Q&A – 5 pm “sharp” ✓ &unknown;");
  });

  it("drops scripts and styles with their contents, and every other tag", () => {
    const text = htmlToText('<style>p{color:red}</style><p onclick="x()">Hi<script>alert(1)</script> <img src=x onerror=alert(2)></p>');
    expect(text).toBe("Hi");
  });

  it("leaves no markup behind, even when escaped markup is decoded", () => {
    // Decoding happens after tags are stripped, so this is shown as text, never parsed as a tag.
    expect(htmlToText("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>")).toBe("<script>alert(1)</script>");
  });

  it("is empty for no message", () => {
    expect(htmlToText(null)).toBe("");
    expect(htmlToText("<p> </p>")).toBe("");
  });
});

describe("excerpt", () => {
  it("returns short text whole, on one line", () => {
    expect(excerpt("<p>One</p><p>Two</p>")).toBe("One Two");
  });

  it("drops a leading bullet but keeps the rest", () => {
    expect(excerpt("<ul><li>Hello everyone</li><li>Bring a laptop</li></ul>")).toBe("Hello everyone • Bring a laptop");
  });

  it("cuts long text at a word", () => {
    const long = `<p>${"word ".repeat(60)}</p>`;
    const short = excerpt(long, 50);
    expect(short.endsWith("word…")).toBe(true);
    expect(short.length).toBeLessThanOrEqual(51);
  });
});
