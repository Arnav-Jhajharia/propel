import { NextRequest, NextResponse } from 'next/server';
import { propertyGuruScraper } from '@/lib/propertyguru-scraper';
import { db, properties as propertiesTable } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, searchParams } = await request.json();

    let importedProperties = [];

    if (url) {
      // Import single property from URL
      const property = await propertyGuruScraper.scrapeProperty(url);
      if (property) {
        // Convert PropertyGuru format to our database format
        const dbProperty = {
          userId,
          id: property.id,
          url: property.url,
          title: property.title,
          address: property.address,
          price: property.price,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          sqft: property.sqft,
          heroImage: 'https://sg1-cdn.pgimgs.com/listing/60178874/UPHO.157261486.V800/Normanton-Park-Buona-Vista-West-Coast-Clementi-New-Town-Singapore.jpg',
          description: property.description,
          propertyType: property.propertyType,
          furnished: property.furnished,
          availableFrom: property.availableFrom,
        };

        // Check if property already exists
        const existingProperty = await db
          .select()
          .from(propertiesTable)
          .where(and(eq(propertiesTable.url, property.url), eq(propertiesTable.userId, userId)))
          .limit(1);

        if (existingProperty.length === 0) {
          const [insertedProperty] = await db
            .insert(propertiesTable)
            .values(dbProperty)
            .returning();
          
          importedProperties.push(insertedProperty);
        } else {
          return NextResponse.json({ 
            error: 'Property already exists',
            property: existingProperty[0]
          }, { status: 409 });
        }
      }
    } else if (searchParams) {
      // Import multiple properties from search
      const properties = await propertyGuruScraper.scrapeSearchResults(searchParams);
      
      for (const property of properties) {
        const dbProperty = {
          userId,
          id: property.id,
          url: property.url,
          title: property.title,
          address: property.address,
          price: property.price,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          sqft: property.sqft,
          heroImage: 'https://sg1-cdn.pgimgs.com/listing/60178874/UPHO.157261486.V800/Normanton-Park-Buona-Vista-West-Coast-Clementi-New-Town-Singapore.jpg',
          description: property.description,
          propertyType: property.propertyType,
          furnished: property.furnished,
          availableFrom: property.availableFrom,
        };

        // Check if property already exists
        const existingProperty = await db
          .select()
          .from(propertiesTable)
          .where(and(eq(propertiesTable.url, property.url), eq(propertiesTable.userId, userId)))
          .limit(1);

        if (existingProperty.length === 0) {
          const [insertedProperty] = await db
            .insert(propertiesTable)
            .values(dbProperty)
            .returning();
          
          importedProperties.push(insertedProperty);
        }
      }
    } else {
      return NextResponse.json({ error: 'URL or search parameters required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedProperties.length} properties`,
      properties: importedProperties
    });

  } catch (error) {
    console.error('PropertyGuru import error:', error);
    return NextResponse.json({ 
      error: 'Failed to import properties',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const runtime = "nodejs";

