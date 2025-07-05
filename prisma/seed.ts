import { PrismaClient, Role, Team, Swimmer } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
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
  const swimmers: Swimmer[] = [] // Store created swimmers for later use

  for (let i = 0; i < SWIMMERS; i++) {
    const password = await bcrypt.hash('asdf;lkj', 10)
    const email = faker.internet.email()
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    // Assign a team to the swimmer
    const assignedTeam = faker.helpers.arrayElement(teams)

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
        teamId: assignedTeam.id // Assign team to swimmer
      }
    })
    swimmers.push(swimmerProfile) // Add swimmer to the list

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

  // Create groups for teams
  for (const team of teams) {
    const numGroups = faker.number.int({ min: 1, max: 3 }) // Each team gets 1-3 groups
    for (let i = 0; i < numGroups; i++) {
      const groupName = faker.company.buzzNoun() + ' Group ' + i // Append index to ensure uniqueness within the team
      const group = await prisma.group.create({
        data: {
          name: groupName,
          teamId: team.id
        }
      })
      console.log(`Created group "${groupName}" for team ${team.id}`)

      // Assign some swimmers from the team to this group (e.g., 50% chance for each swimmer in the team)
      const teamSwimmers = swimmers.filter((s) => s.teamId === team.id)
      for (const swimmer of teamSwimmers) {
        if (Math.random() < 0.5) {
          await prisma.swimmer.update({
            where: { id: swimmer.id },
            data: {
              groups: {
                connect: { id: group.id }
              }
            }
          })
          console.log(
            `Assigned swimmer ${swimmer.firstName} ${swimmer.lastName} to group ${group.name}`
          )
        }
      }
    }
  }

  // Create trainings
  const allSwimmers = await prisma.swimmer.findMany()
  const allGroups = await prisma.group.findMany()

  for (const group of allGroups) {
    // Create trainings for the past 365 days for each group
    const today = new Date()
    for (let day = 0; day < 365; day++) {
      if (Math.random() < 0.9) {
        // 90% chance to have at least one training on this day for the group
        const numTrainingsThisDay = faker.number.int({ min: 1, max: 2 }) // 1 or 2 trainings
        for (let i = 0; i < numTrainingsThisDay; i++) {
          const trainingDate = new Date(today)
          trainingDate.setDate(today.getDate() - day)
          // Ensure the time is also varied, not just the date
          trainingDate.setHours(
            faker.number.int({ min: 6, max: 20 }),
            faker.number.int({ min: 0, max: 59 })
          )

          const trainingMinutes = faker.number.int({ min: 45, max: 150 })
          const trainingMeters = faker.number.int({ min: 1500, max: 6000 })
          const trainingDescription =
            Math.random() < 0.3 ? faker.lorem.sentence() : null // 30% chance of having a description

          const groupSwimmers = await prisma.swimmer.findMany({
            where: { groups: { some: { id: group.id } } },
            select: { id: true } // Only select IDs for connecting
          })

          if (groupSwimmers.length > 0) {
            await prisma.training.create({
              data: {
                date: trainingDate,
                minutes: trainingMinutes,
                meters: trainingMeters,
                description: trainingDescription,
                groupId: group.id,
                swimmers: {
                  connect: groupSwimmers.map((s) => ({ id: s.id }))
                }
              }
            })
            console.log(
              `Created training for group ${group.name} on ${trainingDate.toISOString()}`
            )
          } else {
            // Optionally handle groups with no swimmers, though ideally groups should have swimmers
            console.log(
              `Skipping training for group ${group.name} on ${trainingDate.toISOString()} as it has no swimmers.`
            )
          }
        }
      }
    }
  }

  // Create some individual trainings (not tied to a specific group, but can have a group_id if the swimmer is in one)
  for (const swimmer of allSwimmers) {
    if (Math.random() < 0.2) {
      // 20% chance for a swimmer to have an individual training
      const trainingDate = faker.date.recent({ days: 365 })
      const trainingMinutes = faker.number.int({ min: 20, max: 90 })
      const trainingMeters = faker.number.int({ min: 500, max: 3000 })
      const trainingDescription =
        Math.random() < 0.7 ? faker.lorem.sentence() : null

      // A swimmer might belong to a group, find one if they do
      const swimmerGroups = await prisma.group.findMany({
        where: { swimmers: { some: { id: swimmer.id } } },
        select: { id: true }
      })
      const assignedGroupId =
        swimmerGroups.length > 0
          ? faker.helpers.arrayElement(swimmerGroups).id
          : null

      await prisma.training.create({
        data: {
          date: trainingDate,
          minutes: trainingMinutes,
          meters: trainingMeters,
          description: trainingDescription,
          groupId: assignedGroupId,
          swimmers: {
            connect: { id: swimmer.id }
          }
        }
      })
      console.log(
        `Created individual training for swimmer ${swimmer.firstName} ${swimmer.lastName} on ${trainingDate.toDateString()}`
      )
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
