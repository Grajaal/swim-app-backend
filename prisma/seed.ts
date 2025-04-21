import { PrismaClient, Role, Team } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

const COACHES = 100
const SWIMMERS = COACHES * 5

async function main() {
  // Clean the database

  const coachIds: string[] = []

  console.log('Database cleaned')

  // Create users
  for (let i = 0; i < COACHES; i++) {
    const password = await bcrypt.hash('asdf;lkj', 10)
    const email = faker.internet.email()
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    const coachUser = await prisma.user.create({
      data: {
        email,
        password,
        role: Role.COACH
      }
    })

    const coach = await prisma.coach.create({
      data: {
        id: coachUser.id,
        firstName,
        lastName
      }
    })

    coachIds.push(coach.id)

    console.log(`Created coach ${firstName} ${lastName} (${email})`)
  }

  // Create teams for coaches
  const teams: Team[] = []
  for (const coachId of coachIds) {
    const teamCode = generateTeamCode()
    const team = await prisma.team.create({
      data: {
        coachId,
        teamCode
      }
    })

    teams.push(team)
    console.log(`Created team with code ${teamCode} for coach ${coachId}`)
  }

  // Create swimmer users and profiles

  for (let i = 0; i < SWIMMERS; i++) {
    const password = await bcrypt.hash('asdf;lkj', 10)
    const email = faker.internet.email()
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    // Assign a team to some swimmers (75% chance)
    const teamId = faker.helpers.arrayElement(teams).id

    const swimmerUser = await prisma.user.create({
      data: {
        email,
        password,
        role: Role.SWIMMER
      }
    })

    const swimmerProfile = await prisma.swimmer.create({
      data: {
        id: swimmerUser.id,
        firstName,
        lastName,
        teamId
      }
    })

    console.log(`Created swimmer ${firstName} ${lastName} (${email})`)

    // Create daily forms for the past 10 days (with 70% probability each day)
    const today = new Date()

    for (let day = 0; day < 365; day++) {
      // 70% chance to have a form on this day
      if (Math.random() < 0.9) {
        const date = new Date(today)
        date.setDate(today.getDate() - day)

        await prisma.dailyForm.create({
          data: {
            swimmerId: swimmerProfile.id,
            date,
            sleepHours: faker.number.int({ min: 1, max: 10 }),
            sleepQuality: faker.number.int({ min: 1, max: 10 }),
            musclePain: faker.number.int({ min: 1, max: 10 }),
            fatigue: faker.number.int({ min: 1, max: 10 }),
            stress: faker.number.int({ min: 1, max: 10 })
          }
        })
      }
    }
  }

  console.log('Seed completed successfully!')
}

// Helper function to generate a random team code
function generateTeamCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
