import { Request, Response } from 'express';
import getCards from '../../utils/getCards';

const GetTestDataController = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    let numberOfFourAnswersQuestions = req.query.numberOfFourAnswersQuestions ? parseInt(req.query.numberOfFourAnswersQuestions as string) : 0;
    let numberOfTrueFalseQuestions = req.query.numberOfTrueFalseQuestions ? parseInt(req.query.numberOfTrueFalseQuestions as string) : 0;
    let numberOfTextInputQuestions = req.query.numberOfTextInputQuestions ? parseInt(req.query.numberOfTextInputQuestions as string) : 0;

    const collectionUuid = req.query.collectionUuid as string;

    if (isNaN(numberOfFourAnswersQuestions) || isNaN(numberOfTrueFalseQuestions) || isNaN(numberOfTextInputQuestions)) {
        return res.status(400).json({ error: true, message: 'Invalid query parameters' });
    }
    if (numberOfFourAnswersQuestions < 0 || numberOfTrueFalseQuestions < 0 || numberOfTextInputQuestions < 0) {
        return res.status(400).json({ error: true, message: 'Query parameters must be non-negative' });
    }
    if (numberOfFourAnswersQuestions === 0 && numberOfTrueFalseQuestions === 0 && numberOfTextInputQuestions === 0) {
        return res.status(400).json({ error: true, message: 'At least one question type must be requested' });
    }

    const result = await getCards(collectionUuid, req.user);

    if (result.error || !result.cards) {
        return res.status(result.code || 500).json({ error: true, message: result.message || 'Internal server error' });
    }

    const cards = result.cards;

    const testSet: Array<{
        id: number;
        type: 'multiple-choice' | 'true-false' | 'text-input';
        question: string;
        answer: string;
        options: string[];
        givenAnswer?: string;
    }> = [];

    // Shuffle the cards array to randomize the selection

    let shuffledCards = [...cards];
    console.log(shuffledCards);
    for (let i = shuffledCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }
    console.log(shuffledCards);

    let itemObject: {
        id: number;
        type: 'multiple-choice' | 'true-false' | 'text-input';
        question: string;
        givenAnswer?: string;
        answer: string;
        options: string[];
    };

    numberOfFourAnswersQuestions = Math.min(numberOfFourAnswersQuestions, shuffledCards.length);

    if (numberOfFourAnswersQuestions !== 0) {
        for (let i = 0; i < numberOfFourAnswersQuestions; i++) {

            const WholeItem = shuffledCards[i];
            let optionsArray = shuffledCards.filter(item => item.id !== WholeItem.id).map(item => item.definition); 
            let options: Array<string> = [];

            for (let a = 0; a < 3; a++) {
                const index = Math.floor(Math.random() * optionsArray.length);
                options.push(optionsArray[index]);
                optionsArray.splice(index, 1);
            }

            options.splice(Math.floor(Math.random() * 4), 0, WholeItem.definition);

            itemObject = {
                id: WholeItem.id,
                type: 'multiple-choice',
                question: WholeItem.term,
                answer: WholeItem.definition,
                options: options,
            }

            testSet.push(itemObject);
        }

        shuffledCards.splice(0, numberOfFourAnswersQuestions);
    }

    numberOfTrueFalseQuestions = Math.min(numberOfTrueFalseQuestions, shuffledCards.length);

    if (numberOfTrueFalseQuestions !== 0) {
        for (let i = 0; i < numberOfTrueFalseQuestions; i++) {
            const currentItem = shuffledCards[i];
            console.log('Current Item:', currentItem);

            const TrueOrFalse = Math.random() >= 0.5 ? true : false;

            if (TrueOrFalse === true) {
                itemObject = {
                    id: currentItem.id,
                    type: 'true-false',
                    question: currentItem.term,
                    givenAnswer: currentItem.definition,
                    answer: "True",
                    options: ["True", "False"]
                }
                testSet.push(itemObject);
                continue;
            }

            const j = Math.floor(Math.random() * shuffledCards.length);
            const givenAnswer = shuffledCards[j].definition;

            itemObject = {
                id: currentItem.id,
                type: 'true-false',
                question: currentItem.term,
                givenAnswer: givenAnswer,
                answer: givenAnswer === currentItem.definition ? "True" : "False",
                options: ["True", "False"]
            }

            testSet.push(itemObject);
        }

        shuffledCards.splice(0, numberOfTrueFalseQuestions);
        
    }

    numberOfTextInputQuestions = Math.min(numberOfTextInputQuestions, shuffledCards.length);

    if (numberOfTextInputQuestions !== 0) {
        
        for (let i = 0; i < numberOfTextInputQuestions; i++) {
            const currentItem = shuffledCards[i];

            itemObject = {
                id: currentItem.id,
                type: "text-input",
                question: currentItem.term,
                answer: currentItem.definition,
                options: []
            }

            testSet.push(itemObject);
        }

    }

    return res.status(200).json({error: false, message: "Test set successfully created.", testSet: testSet});

}

export default GetTestDataController;