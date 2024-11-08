import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */

// Get the weighted average of a specified learner's grades, per class
router.get("/learner/:id/avg-class", async (req, res) => {
  let collection = await db.collection("grades");

  let result = await collection
    .aggregate([
      {
        $match: { learner_id: Number(req.params.id) },
      },
      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$class_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          class_id: "$_id",
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
    ])
    .toArray();

  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});



  //Create a GET route at /grades/stats
  router.get('/grades/stats', async (req, res) => {
    try {
      await client.connect();
      const db = client.db(dbName);
      const gradesCollection = db.collection("grades");  
  
      // Aggregation pipeline
      const aggregation = [
        {
          // Match learners who have a weighted average greater than 70
          $match: {
            weightedAverage: { $gt: 70 }
          }
        },
        {
          // Count the number of learners with weightedAverage > 70
          $count: 'learnersAbove70'
        },
        {
          //  the total number of learners and the learnersAbove70
          $facet: {
            total: [
              { $count: 'totalLearners' }
            ],
            above70: [
              { $count: 'learnersAbove70' }
            ]
          }
        },
        {
          // Project the results to extract counts from the arrays
          $project: {
            totalLearners: { $arrayElemAt: ["$total.totalLearners", 0] },
            learnersAbove70: { $arrayElemAt: ["$above70.learnersAbove70", 0] }
          }
        },
        {
          // Calculate the percentage of learners with average > 70
          $project: {
            totalLearners: 1,
            learnersAbove70: 1,
            percentageAbove70: {
              $cond: {
                if: { $eq: ["$totalLearners", 0] },
                then: 0,
                else: {
                  $multiply: [
                    { $divide: ["$learnersAbove70", "$totalLearners"] },
                    100
                  ]
                }
              }
            }
          }
        }
      ];
  
      // Execute the aggregation pipeline
      const result = await grades.aggregate(aggregation).toArray();
  
      // Send the response
      if (result.length > 0) {
        const { totalLearners, learnersAbove70, percentageAbove70 } = result[0];
        return res.json({
          totalLearners: totalLearners || 0,
          learnersAbove70: learnersAbove70 || 0,
          percentageAbove70: percentageAbove70.toFixed(2)  // Format percentage to 2 decimal places
        });
      } else {
        return res.json({
          totalLearners: 0,
          learnersAbove70: 0,
          percentageAbove70: '0.00'
        });
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).send('Internal Server Error');
    } finally {
      // Close the MongoDB client connection
      await client.close();
    }
  });


  //Create a GET route at /grades/stats/:id
// mimic the above aggregation pipeline, but only for learners within a class 

  router.get('/grades/stats/:id', async (req, res) => {

    console.log("Route reached!");
    const classId = parseInt(req.params.id, 10);

      // Validate that classId is a number
    if (isNaN(classId)) {
      return res.status(400).send('Invalid class ID');
    }
  
    try {
      await client.connect();
      const db = client.db(dbName);
      const gradesCollection = db.collection('grades');  
  
      // Aggregation pipeline to calculate statistics for the specific class
      const aggregation = [
        {
          // Match learners in the specific class with class_id = :id and weightedAverage > 70
          $match: {
            class_id: classId,
            weightedAverage: { $gt: 70 }
          }
        },
        {
          // Count the number of learners in the specified class with weightedAverage > 70
          $count: 'learnersAbove70'
        },
        {
          //  the total number of learners in the class and learnersAbove70
          $facet: {
            total: [
              { $match: { class_id: classId } },
              { $count: 'totalLearners' }
            ],
            above70: [
              { $match: { class_id: classId, weightedAverage: { $gt: 70 } } },
              { $count: 'learnersAbove70' }
            ]
          }
        },
        {
          // Project the results to extract counts from the arrays
          $project: {
            totalLearners: { $arrayElemAt: ["$total.totalLearners", 0] },
            learnersAbove70: { $arrayElemAt: ["$above70.learnersAbove70", 0] }
          }
        },
        {
          // Calculate the percentage of learners with average > 70
          $project: {
            totalLearners: 1,
            learnersAbove70: 1,
            percentageAbove70: {
              $cond: {
                if: { $eq: ["$totalLearners", 0] },
                then: 0,
                else: {
                  $multiply: [
                    { $divide: ["$learnersAbove70", "$totalLearners"] },
                    100
                  ]
                }
              }
            }
          }
        }
      ];
  
      // Execute the aggregation pipeline
      const result = await grades.aggregate(aggregation).toArray();
  
      // Send the response
      if (result.length > 0) {
        const { totalLearners, learnersAbove70, percentageAbove70 } = result[0];
        return res.json({
          totalLearners: totalLearners || 0,
          learnersAbove70: learnersAbove70 || 0,
          percentageAbove70: percentageAbove70.toFixed(2)  // Format percentage to 2 decimal places
        });
      } else {
        return res.json({
          totalLearners: 0,
          learnersAbove70: 0,
          percentageAbove70: '0.00'
        });
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).send('Internal Server Error');
    } finally {
      // Close the MongoDB client connection
      await client.close();
    }
  });
  
  export default router;