import { NextRequest, NextResponse } from "next/server";
import { db, tasks } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// GET /api/tasks - Get all tasks for the authenticated user
export async function GET(req: NextRequest) {
  try {
    // For now, we'll use a hardcoded userId since auth is not fully implemented
    // In production, you'd get this from the session
    const userId = "demo_user_id";

    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json({ tasks: allTasks }, { status: 200 });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, priority, dueDate, propertyId, clientId } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // For now, we'll use a hardcoded userId
    const userId = "demo_user_id";

    const newTask = {
      id: createId(),
      userId,
      title,
      description: description || null,
      completed: false,
      priority: priority || "medium",
      dueDate: dueDate || null,
      propertyId: propertyId || null,
      clientId: clientId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(tasks).values(newTask);

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks - Update multiple tasks or a single task
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, updates } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const userId = "demo_user_id";

    // Verify task belongs to user
    const existingTask = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!existingTask.length) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await db
      .update(tasks)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    const userId = "demo_user_id";

    // Verify task belongs to user before deleting
    const existingTask = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!existingTask.length) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

