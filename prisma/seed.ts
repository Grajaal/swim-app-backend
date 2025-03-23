import { faker } from '@faker-js/faker'
import { PrismaClient, Role } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  try {
    console.log('Start seeding users...')

    // Define number of users to generate
    const USER_COUNT = 100

    // Create an array of user objects
    const users = Array.from({ length: USER_COUNT }, () => ({
      role: faker.helpers.enumValue(Role),
      email: faker.internet.email().toLowerCase(),
      password: 'asdf;lkj',
      createdAt: faker.date.past()
    }))

    // Use createMany for efficient bulk insertion
    const createdUsers = await db.user.createMany({
      data: users,
      skipDuplicates: true // Skip records that conflict with unique field constraints
    })

    console.log(`Seeding completed! Created ${createdUsers.count} users`)
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
