import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

type ApiKeySummary = {
  id: string;
  name: string;
  key: string;
  lastUsed: Date | null;
  createdAt: Date;
};

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        key: true,
        lastUsed: true,
        createdAt: true,
      },
    });

    // Mask the keys for security
    const maskedKeys = apiKeys.map((key: ApiKeySummary) => ({
      ...key,
      key: key.key.substring(0, 8) + '...',
    }));

    return NextResponse.json({
      success: true,
      data: maskedKeys,
    });
  } catch (error) {
    console.error('API Keys GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    const body = await req.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const { name } = body;

    // Generate a unique API key
    const key = 'wexa_' + crypto.randomBytes(32).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        workspaceId,
        name: name || 'API Key',
        key,
        secret,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        secret: apiKey.secret, // Only shown once during creation
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    console.error('API Key POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
