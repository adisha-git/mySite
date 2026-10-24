import { profile } from "@/data/profile";

/** Short shareable link: /cv → the CV PDF. */
export function GET(request: Request) {
  return Response.redirect(new URL(profile.cv.href, request.url), 307);
}
