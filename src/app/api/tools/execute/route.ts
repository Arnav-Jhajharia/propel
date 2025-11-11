import { NextResponse } from "next/server";
import { addPropertyFromUrl } from "@/agent/tools/properties";
import { listRecentProperties, listTopProspects } from "@/agent/tools/lists";
import { listTodaysAppointments, buildSchedulePageLink, getCalendlySchedulingUrl } from "@/agent/tools/calendly";
import { createAppointment } from "@/agent/tools/appointments";
import { getSession } from "@/lib/simple-auth";

/**
 * Tool executor endpoint for Dedalus bridge
 * Executes tools from Python bridge service
 */
export async function POST(req: Request) {
  const timestamp = new Date().toISOString();
  console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 🚀 Tool execution request received`);
  
  try {
    const json = await req.json();
    const { tool, arguments: args, userId } = json;

    console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 🔧 Tool: ${tool}`);
    console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 📋 Arguments:`, JSON.stringify(args, null, 2));
    console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 👤 User ID (provided): ${userId || "not provided"}`);

    if (!tool) {
      console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ❌ Tool name is required`);
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    // Get userId from request or use provided one
    let actualUserId = userId || "anonymous";
    try {
      const cookieHeader = req.headers.get("cookie") || "";
      const token = cookieHeader.split("session-token=")[1]?.split(";")[0];
      if (token) {
        const session = await getSession(token);
        if (session?.user?.id) {
          actualUserId = session.user.id;
          console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ✅ Extracted userId from session: ${actualUserId}`);
        }
      }
    } catch (err) {
      console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ⚠️  Session extraction failed:`, err);
    }
    
    console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 👤 Final userId: ${actualUserId}`);

    // Execute the tool based on name
    const startTime = Date.now();
    let result: any;

    switch (tool) {
      case "add_property_from_url":
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 🏠 Executing add_property_from_url`);
        if (!args?.url) {
          console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ❌ URL is required`);
          return NextResponse.json({ error: "URL is required for add_property_from_url" }, { status: 400 });
        }
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 🌐 URL: ${args.url}`);
        const propertyResult = await addPropertyFromUrl(args.url, actualUserId);
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ✅ Property result:`, JSON.stringify(propertyResult, null, 2));
        result = {
          created: propertyResult.created,
          property: propertyResult.property,
          message: propertyResult.message,
        };
        break;

      case "list_properties":
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 📋 Executing list_properties`);
        const properties = await listRecentProperties(actualUserId, 10);
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ✅ Found ${properties.length} properties`);
        result = { properties: properties.map((p) => ({ id: p.id, title: p.title, address: p.address, price: p.price })) };
        break;

      case "top_prospects":
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 👥 Executing top_prospects`);
        const prospects = await listTopProspects(actualUserId, 10);
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ✅ Found ${prospects.length} prospects`);
        result = {
          prospects: prospects.map((p) => ({
            clientName: p.clientName,
            score: p.score,
            propertyTitle: p.propertyTitle,
          })),
        };
        break;

      case "list_todays_schedule":
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 📅 Executing list_todays_schedule`);
        const date = args?.date || "today";
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 📆 Date: ${date}`);
        const appointments = await listTodaysAppointments(actualUserId, date);
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ✅ Found ${appointments.length} appointments`);
        result = {
          appointments: appointments.map((a) => ({
            id: a.id,
            title: a.title,
            startTime: a.startTime,
            invitee: a.invitee,
          })),
        };
        break;

      case "build_schedule_link":
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 🔗 Executing build_schedule_link`);
        const link = buildSchedulePageLink({ name: args?.name, email: args?.email, phone: args?.phone });
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ✅ Generated link: ${link}`);
        result = { link };
        break;

      case "create_appointment":
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 📅 Executing create_appointment`);
        if (!args?.startTime || !args?.endTime) {
          console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ❌ startTime and endTime are required`);
          return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
        }
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 📆 Start: ${args.startTime}, End: ${args.endTime}`);
        const appointmentResult = await createAppointment(actualUserId, {
          title: args.title,
          description: args.description,
          startTime: args.startTime,
          endTime: args.endTime,
          inviteeName: args.inviteeName,
          inviteeEmail: args.inviteeEmail,
          inviteePhone: args.inviteePhone,
        });
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ✅ Appointment created:`, JSON.stringify(appointmentResult, null, 2));
        result = { created: appointmentResult.createdGoogle || true, appointment: appointmentResult };
        break;

      default:
        console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ❌ Unknown tool: ${tool}`);
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }

    const executionTime = Date.now() - startTime;
    console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ✅ Tool execution completed (${executionTime}ms)`);
    console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 📤 Returning result:`, JSON.stringify(result, null, 2));
    
    return NextResponse.json({ result });
  } catch (err: any) {
    console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] ❌ Error:`, err?.message);
    console.log(`[TOOL EXECUTOR DEBUG ${timestamp}] 📋 Stack:`, err?.stack);
    return NextResponse.json({ error: err?.message || "Tool execution failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

